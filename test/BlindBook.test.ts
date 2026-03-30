import hre from "hardhat";
import { expect } from "chai";

describe("BlindBook", function () {
  let blindBook: any;
  let buyer: any;
  let seller: any;

  const Side = { BUY: 0, SELL: 1 };
  const Status = { ACTIVE: 0, FILLED: 1, CANCELLED: 2 };

  beforeEach(async function () {
    [buyer, seller] = await hre.ethers.getSigners();
    const BlindBook = await hre.ethers.getContractFactory("BlindBook");
    blindBook = await BlindBook.deploy();
    await blindBook.waitForDeployment();
  });

  describe("Order Submission", function () {
    it("should submit a buy order", async function () {
      await (await blindBook.connect(buyer).submitOrder(Side.BUY, 100, 5000)).wait();
      const [trader, side, status] = await blindBook.getOrderInfo(0);
      expect(trader).to.equal(buyer.address);
      expect(side).to.equal(Side.BUY);
      expect(status).to.equal(Status.ACTIVE);
    });

    it("should emit OrderSubmitted event", async function () {
      await expect(blindBook.connect(buyer).submitOrder(Side.BUY, 100, 5000))
        .to.emit(blindBook, "OrderSubmitted")
        .withArgs(0, buyer.address, Side.BUY);
    });
  });

  describe("Order Matching", function () {
    it("should match when sell price <= buy price", async function () {
      await (await blindBook.connect(buyer).submitOrder(Side.BUY, 100, 5000)).wait();
      await (await blindBook.connect(seller).submitOrder(Side.SELL, 50, 4800)).wait();
      await (await blindBook.matchOrders(0, 1)).wait();

      const fill = await blindBook.getMatchFillQty(0);
      expect(fill).to.equal(50);
    });

    it("should match when prices are equal", async function () {
      await (await blindBook.connect(buyer).submitOrder(Side.BUY, 100, 5000)).wait();
      await (await blindBook.connect(seller).submitOrder(Side.SELL, 50, 5000)).wait();
      await (await blindBook.matchOrders(0, 1)).wait();
      expect(await blindBook.getMatchFillQty(0)).to.equal(50);
    });

    it("should NOT match when sell price > buy price", async function () {
      await (await blindBook.connect(buyer).submitOrder(Side.BUY, 100, 3000)).wait();
      await (await blindBook.connect(seller).submitOrder(Side.SELL, 50, 5000)).wait();
      await (await blindBook.matchOrders(0, 1)).wait();
      expect(await blindBook.getMatchFillQty(0)).to.equal(0);
    });

    it("should compute fill as min(buy, sell)", async function () {
      await (await blindBook.connect(buyer).submitOrder(Side.BUY, 30, 5000)).wait();
      await (await blindBook.connect(seller).submitOrder(Side.SELL, 100, 4900)).wait();
      await (await blindBook.matchOrders(0, 1)).wait();
      expect(await blindBook.getMatchFillQty(0)).to.equal(30);
    });

    it("should emit OrdersMatched", async function () {
      await (await blindBook.connect(buyer).submitOrder(Side.BUY, 100, 5000)).wait();
      await (await blindBook.connect(seller).submitOrder(Side.SELL, 50, 4800)).wait();
      await expect(blindBook.matchOrders(0, 1))
        .to.emit(blindBook, "OrdersMatched")
        .withArgs(0, 0, 1);
    });
  });

  describe("Reveal & Settlement", function () {
    it("should mark FILLED on successful match reveal", async function () {
      await (await blindBook.connect(buyer).submitOrder(Side.BUY, 100, 5000)).wait();
      await (await blindBook.connect(seller).submitOrder(Side.SELL, 50, 4800)).wait();
      await (await blindBook.matchOrders(0, 1)).wait();
      await (await blindBook.revealFill(0)).wait();

      const [, , buyStatus] = await blindBook.getOrderInfo(0);
      const [, , sellStatus] = await blindBook.getOrderInfo(1);
      expect(buyStatus).to.equal(Status.FILLED);
      expect(sellStatus).to.equal(Status.FILLED);
    });

    it("should keep ACTIVE on no-match reveal", async function () {
      await (await blindBook.connect(buyer).submitOrder(Side.BUY, 100, 3000)).wait();
      await (await blindBook.connect(seller).submitOrder(Side.SELL, 50, 5000)).wait();
      await (await blindBook.matchOrders(0, 1)).wait();
      await (await blindBook.revealFill(0)).wait();

      const [, , buyStatus] = await blindBook.getOrderInfo(0);
      expect(buyStatus).to.equal(Status.ACTIVE);
    });

    it("should prevent double reveal", async function () {
      await (await blindBook.connect(buyer).submitOrder(Side.BUY, 100, 5000)).wait();
      await (await blindBook.connect(seller).submitOrder(Side.SELL, 50, 4800)).wait();
      await (await blindBook.matchOrders(0, 1)).wait();
      await (await blindBook.revealFill(0)).wait();
      await expect(blindBook.revealFill(0)).to.be.revertedWith("Already revealed");
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
