import hre from "hardhat";
import { expect } from "chai";
import { CofheClient } from "@cofhe/sdk";
import { Encryptable } from "@cofhe/sdk";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("BlindBook", function () {
  let blindBook: any;
  let buyer: HardhatEthersSigner;
  let seller: HardhatEthersSigner;
  let buyerClient: CofheClient;
  let sellerClient: CofheClient;

  const Side = { BUY: 0, SELL: 1 };
  const Status = { ACTIVE: 0, FILLED: 1, CANCELLED: 2 };

  beforeEach(async function () {
    [buyer, seller] = await hre.ethers.getSigners();
    buyerClient = await hre.cofhe.createClientWithBatteries(buyer);
    sellerClient = await hre.cofhe.createClientWithBatteries(seller);

    const BlindBook = await hre.ethers.getContractFactory("BlindBook");
    blindBook = await BlindBook.deploy();
    await blindBook.waitForDeployment();
  });

  describe("Order Submission", function () {
    it("should submit a buy order and encrypt values via FHE", async function () {
      await (await blindBook.connect(buyer).submitOrder(Side.BUY, 100, 5000)).wait();
      const [trader, side, status] = await blindBook.getOrderInfo(0);
      expect(trader).to.equal(buyer.address);
      expect(side).to.equal(Side.BUY);
      expect(status).to.equal(Status.ACTIVE);
    });

    it("should store encrypted amount via FHE.asEuint64", async function () {
      await (await blindBook.connect(buyer).submitOrder(Side.BUY, 100, 5000)).wait();

      // The stored amount is an encrypted euint64 handle, not plaintext 100
      const encAmount = await blindBook.getOrderAmount(0);
      expect(encAmount).to.not.equal(0); // it's a ciphertext handle

      // In mock env, verify it was encrypted correctly
      await hre.cofhe.mocks.expectPlaintext(encAmount, 100n);
    });
  });

  describe("FHE Matching", function () {
    it("should match orders using FHE.lte, FHE.min, FHE.select", async function () {
      await (await blindBook.connect(buyer).submitOrder(Side.BUY, 100, 5000)).wait();
      await (await blindBook.connect(seller).submitOrder(Side.SELL, 50, 4800)).wait();

      await (await blindBook.matchOrders(0, 1)).wait();

      // Fill qty should be min(100, 50) = 50, computed via FHE.min
      const fillQtyHash = await blindBook.getMatchFillQty(0);
      await hre.cofhe.mocks.expectPlaintext(fillQtyHash, 50n);
    });

    it("should match when prices are equal (FHE.lte)", async function () {
      await (await blindBook.connect(buyer).submitOrder(Side.BUY, 100, 5000)).wait();
      await (await blindBook.connect(seller).submitOrder(Side.SELL, 50, 5000)).wait();

      await (await blindBook.matchOrders(0, 1)).wait();

      const fillQtyHash = await blindBook.getMatchFillQty(0);
      await hre.cofhe.mocks.expectPlaintext(fillQtyHash, 50n);
    });

    it("should NOT match when sell price > buy price", async function () {
      await (await blindBook.connect(buyer).submitOrder(Side.BUY, 100, 3000)).wait();
      await (await blindBook.connect(seller).submitOrder(Side.SELL, 50, 5000)).wait();

      await (await blindBook.matchOrders(0, 1)).wait();

      // FHE.select returns 0 when canMatch is false
      const fillQtyHash = await blindBook.getMatchFillQty(0);
      await hre.cofhe.mocks.expectPlaintext(fillQtyHash, 0n);
    });

    it("should compute remaining amounts via FHE.select and FHE.sub", async function () {
      await (await blindBook.connect(buyer).submitOrder(Side.BUY, 100, 5000)).wait();
      await (await blindBook.connect(seller).submitOrder(Side.SELL, 50, 4800)).wait();

      await (await blindBook.matchOrders(0, 1)).wait();

      // Buy remaining: 100 - 50 = 50
      const buyRemaining = await blindBook.getOrderAmount(0);
      await hre.cofhe.mocks.expectPlaintext(buyRemaining, 50n);

      // Sell remaining: 50 - 50 = 0
      const sellRemaining = await blindBook.getOrderAmount(1);
      await hre.cofhe.mocks.expectPlaintext(sellRemaining, 0n);
    });
  });

  describe("Reveal & Settlement", function () {
    it("should mark FILLED on successful reveal", async function () {
      await (await blindBook.connect(buyer).submitOrder(Side.BUY, 100, 5000)).wait();
      await (await blindBook.connect(seller).submitOrder(Side.SELL, 50, 4800)).wait();
      await (await blindBook.matchOrders(0, 1)).wait();
      await (await blindBook.revealFill(0, 50)).wait();

      const [, , buyStatus] = await blindBook.getOrderInfo(0);
      const [, , sellStatus] = await blindBook.getOrderInfo(1);
      expect(buyStatus).to.equal(Status.FILLED);
      expect(sellStatus).to.equal(Status.FILLED);
    });

    it("should keep ACTIVE on zero-fill reveal", async function () {
      await (await blindBook.connect(buyer).submitOrder(Side.BUY, 100, 3000)).wait();
      await (await blindBook.connect(seller).submitOrder(Side.SELL, 50, 5000)).wait();
      await (await blindBook.matchOrders(0, 1)).wait();
      await (await blindBook.revealFill(0, 0)).wait();

      const [, , buyStatus] = await blindBook.getOrderInfo(0);
      expect(buyStatus).to.equal(Status.ACTIVE);
    });
  });

  describe("Cancellation", function () {
    it("should cancel own order", async function () {
      await (await blindBook.connect(buyer).submitOrder(Side.BUY, 100, 5000)).wait();
      await (await blindBook.connect(buyer).cancelOrder(0)).wait();
      const [, , status] = await blindBook.getOrderInfo(0);
      expect(status).to.equal(Status.CANCELLED);
    });

    it("should prevent others from cancelling", async function () {
      await (await blindBook.connect(buyer).submitOrder(Side.BUY, 100, 5000)).wait();
      await expect(blindBook.connect(seller).cancelOrder(0)).to.be.revertedWith("Not your order");
    });
  });
});
