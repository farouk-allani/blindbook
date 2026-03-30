import hre from "hardhat";

async function main() {
  console.log("Deploying BlindBook to", hre.network.name, "...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const BlindBook = await hre.ethers.getContractFactory("BlindBook");
  const blindBook = await BlindBook.deploy();
  await blindBook.waitForDeployment();

  const address = await blindBook.getAddress();
  console.log("BlindBook deployed to:", address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
