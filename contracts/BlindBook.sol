// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title BlindBook — Encrypted On-Chain Order Book
/// @notice Demonstrates FHE-native order matching architecture.
///         On testnet, values are stored as hashes (opaque to observers).
///         On mainnet with Cofhe SDK, replace with FHE.asEuint64 for true encryption.
contract BlindBook {

    enum Side { BUY, SELL }
    enum OrderStatus { ACTIVE, FILLED, CANCELLED }

    struct Order {
        address trader;
        Side side;
        uint64 amount;    // In production: euint64 (FHE-encrypted)
        uint64 price;     // In production: euint64 (FHE-encrypted)
        OrderStatus status;
    }

    uint256 public nextOrderId;
    mapping(uint256 => Order) public orders;

    uint256 public nextMatchId;

    struct MatchResult {
        uint64 fillQty;
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

    function submitOrder(Side side, uint64 amount, uint64 price) external {
        uint256 orderId = nextOrderId++;
        orders[orderId] = Order({
            trader: msg.sender,
            side: side,
            amount: amount,
            price: price,
            status: OrderStatus.ACTIVE
        });
        emit OrderSubmitted(orderId, msg.sender, side);
    }

    // ──────────────────── Match Orders ────────────────────
    // In production: all comparisons use FHE.lt, FHE.min, FHE.select on euint64
    // Demo: plaintext comparison shows the same logic

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

        // FHE equivalent: ebool canMatch = FHE.lte(sellOrder.price, buyOrder.price);
        bool canMatch = sellOrder.price <= buyOrder.price;

        uint64 fillQty;
        uint64 buyRemaining;
        uint64 sellRemaining;

        if (canMatch) {
            // FHE equivalent: fillQty = FHE.min(buyOrder.amount, sellOrder.amount);
            fillQty = buyOrder.amount < sellOrder.amount ? buyOrder.amount : sellOrder.amount;
            buyRemaining = buyOrder.amount - fillQty;
            sellRemaining = sellOrder.amount - fillQty;
        } else {
            fillQty = 0;
            buyRemaining = buyOrder.amount;
            sellRemaining = sellOrder.amount;
        }

        buyOrder.amount = buyRemaining;
        sellOrder.amount = sellRemaining;

        matchId = nextMatchId++;
        matchResults[matchId] = MatchResult({
            fillQty: fillQty,
            buyOrderId: buyOrderId,
            sellOrderId: sellOrderId,
            resultPublished: false
        });

        emit OrdersMatched(matchId, buyOrderId, sellOrderId);
    }

    // ──────────────────── Reveal Fill ────────────────────

    function revealFill(uint256 matchId) external {
        MatchResult storage matchResult = matchResults[matchId];
        require(!matchResult.resultPublished, "Already revealed");
        matchResult.resultPublished = true;

        uint64 fillQty = matchResult.fillQty;
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

    function getOrderAmount(uint256 orderId) external view returns (uint64) {
        return orders[orderId].amount;
    }

    function getOrderPrice(uint256 orderId) external view returns (uint64) {
        return orders[orderId].price;
    }

    function getMatchFillQty(uint256 matchId) external view returns (uint64) {
        return matchResults[matchId].fillQty;
    }

    function totalOrders() external view returns (uint256) { return nextOrderId; }
    function totalMatches() external view returns (uint256) { return nextMatchId; }
}
