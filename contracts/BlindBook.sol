// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import {InEuint64} from "@fhenixprotocol/cofhe-contracts/ICofhe.sol";

/// @title BlindBook — Encrypted On-Chain Order Book
/// @notice Orders are encrypted on-chain via FHE. Matching runs on encrypted state.
///         Front-running is mathematically impossible — the contract matches orders it cannot see.
contract BlindBook {

    enum Side { BUY, SELL }
    enum OrderStatus { ACTIVE, FILLED, CANCELLED }

    struct Order {
        address trader;
        Side side;
        euint64 amount;  // FHE-encrypted order quantity
        euint64 price;   // FHE-encrypted limit price
        OrderStatus status;
    }

    uint256 public nextOrderId;
    mapping(uint256 => Order) public orders;

    uint256 public nextMatchId;

    struct MatchResult {
        euint64 fillQty;
        uint256 buyOrderId;
        uint256 sellOrderId;
        bool resultPublished;
    }
    mapping(uint256 => MatchResult) public matchResults;

    struct FillResult {
        uint64 fillQty;
        bool matched;
    }
    mapping(uint256 => FillResult) public fills;

    event OrderSubmitted(uint256 indexed orderId, address indexed trader, Side side);
    event OrdersMatched(uint256 indexed matchId, uint256 indexed buyOrderId, uint256 indexed sellOrderId);
    event FillRevealed(uint256 indexed orderId, uint64 fillQty, bool matched);
    event OrderCancelled(uint256 indexed orderId);

    // ──────────────────── Submit Order ────────────────────

    /// @notice Submit an order with client-side encrypted amount and price.
    /// @dev Inputs are InEuint64 (ciphertext + proof). Plaintext never enters calldata,
    ///      so orders are opaque in the mempool and unfront-runnable.
    function submitOrder(Side side, InEuint64 calldata amount, InEuint64 calldata price) external {
        uint256 orderId = nextOrderId++;

        // Verify the client-produced ciphertext+proof and import as euint64
        euint64 encAmount = FHE.asEuint64(amount);
        euint64 encPrice = FHE.asEuint64(price);

        FHE.allowThis(encAmount);
        FHE.allowThis(encPrice);

        orders[orderId] = Order({
            trader: msg.sender,
            side: side,
            amount: encAmount,
            price: encPrice,
            status: OrderStatus.ACTIVE
        });

        emit OrderSubmitted(orderId, msg.sender, side);
    }

    // ──────────────────── Match Orders ────────────────────

    function matchOrders(
        uint256 buyOrderId,
        uint256 sellOrderId
    ) external returns (uint256 matchId) {
        Order storage buyOrder = orders[buyOrderId];
        Order storage sellOrder = orders[sellOrderId];

        require(buyOrder.side == Side.BUY, "Not a buy order");
        require(sellOrder.side == Side.SELL, "Not a sell order");
        require(
            buyOrder.status == OrderStatus.ACTIVE && sellOrder.status == OrderStatus.ACTIVE,
            "Order not active"
        );

        // FHE comparison: can sell price <= buy price?
        ebool canMatch = FHE.lte(sellOrder.price, buyOrder.price);

        // FHE arithmetic: fill = min(buy, sell), conditional on canMatch
        euint64 fillQty = FHE.min(buyOrder.amount, sellOrder.amount);
        euint64 zero = FHE.asEuint64(0);
        fillQty = FHE.select(canMatch, fillQty, zero);

        // FHE select: compute remaining amounts
        buyOrder.amount = FHE.select(canMatch, FHE.sub(buyOrder.amount, fillQty), buyOrder.amount);
        sellOrder.amount = FHE.select(canMatch, FHE.sub(sellOrder.amount, fillQty), sellOrder.amount);

        FHE.allowThis(buyOrder.amount);
        FHE.allowThis(sellOrder.amount);

        matchId = nextMatchId++;
        matchResults[matchId] = MatchResult({
            fillQty: fillQty,
            buyOrderId: buyOrderId,
            sellOrderId: sellOrderId,
            resultPublished: false
        });

        FHE.allowThis(fillQty);

        emit OrdersMatched(matchId, buyOrderId, sellOrderId);
    }

    // ──────────────────── Reveal Fill ────────────────────

    function revealFill(uint256 matchId, uint64 fillQty) external {
        MatchResult storage matchResult = matchResults[matchId];
        require(!matchResult.resultPublished, "Already revealed");

        matchResult.resultPublished = true;

        bool didMatch = fillQty > 0;

        if (didMatch) {
            orders[matchResult.buyOrderId].status = OrderStatus.FILLED;
            orders[matchResult.sellOrderId].status = OrderStatus.FILLED;
        }

        fills[matchResult.buyOrderId] = FillResult({ fillQty: fillQty, matched: didMatch });
        fills[matchResult.sellOrderId] = FillResult({ fillQty: fillQty, matched: didMatch });

        emit FillRevealed(matchResult.buyOrderId, fillQty, didMatch);
        emit FillRevealed(matchResult.sellOrderId, fillQty, didMatch);
    }

    // ──────────────────── Cancel ────────────────────

    function cancelOrder(uint256 orderId) external {
        Order storage order = orders[orderId];
        require(order.trader == msg.sender, "Not your order");
        require(order.status == OrderStatus.ACTIVE, "Order not active");
        order.status = OrderStatus.CANCELLED;
        emit OrderCancelled(orderId);
    }

    // ──────────────────── Views ────────────────────

    function getOrderInfo(uint256 orderId) external view returns (address trader, Side side, OrderStatus status) {
        Order storage o = orders[orderId];
        return (o.trader, o.side, o.status);
    }

    function getOrderAmount(uint256 orderId) external view returns (euint64) {
        return orders[orderId].amount;
    }

    function getOrderPrice(uint256 orderId) external view returns (euint64) {
        return orders[orderId].price;
    }

    function getMatchFillQty(uint256 matchId) external view returns (euint64) {
        return matchResults[matchId].fillQty;
    }

    function totalOrders() external view returns (uint256) { return nextOrderId; }
    function totalMatches() external view returns (uint256) { return nextMatchId; }
}
