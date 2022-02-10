# Rarible-Clone-Moralis-Youtube-Tutorial
Updated changes on youtube tutorial on Rarable clone by Moralis recent Nitro SDK

As the new Nitro SDK update has removed some of the important tables like "EthNFTTokenOwners" from the server. I used Web3API to fetch details of these tables using getNFTOnwers in the Moralis SDK. 

The youtube tutorial showcases that to use Ganache as a local development chain, but it does not support Web3API. So instead of migrating the contracts to Ganache chain, I used Ropsten Testnet with the help of Infra. You can find the details on how to migrate it on Ropsten below. 

https://medium.com/coinmonks/5-minute-guide-to-deploying-smart-contracts-with-truffle-and-ropsten-b3e30d5ee1e

Also I have updated the cloud functions regards to access the tables. 

References:
https://forum.moralis.io/t/raribleclone-ep-9-no-nfttokenowners-table/371/25

