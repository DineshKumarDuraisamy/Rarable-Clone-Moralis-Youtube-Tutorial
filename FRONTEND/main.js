/* Moralis init code */
const serverUrl = "https://v0elwkbqrwju.usemoralis.com:2053/server";
const appId = "MTXXqrANnfA4OiucipQoyHIv1WUKDuLQ0Eaf122D";
Moralis.start({ serverUrl, appId });
const TOKEN_CONTRACT_ADDRESS = "0x6861932B8931c656ea7891fD7aC2c4ad1d4df1ee";
const MARKETPLACE_CONTRACT_ADDRESS = "0xf27BbaF168f7bE332c4e61769dd2756E43055Be1";
init = async () => {
    hideElement(userItemsSection);
    window.web3 = new Web3(Web3.givenProvider || "ws://localhost:8545");
    window.tokenContract = new web3.eth.Contract(tokenContractAbi, TOKEN_CONTRACT_ADDRESS);
    window.marketplaceContract = new web3.eth.Contract(marketplaceContractAbi, MARKETPLACE_CONTRACT_ADDRESS);
    initUser();
    loadItems();
    loadUserItems2();
    //loadItems2();

    const soldItemsQuery = new Moralis.Query('SoldItems');
    const soldItemsSubscription = await soldItemsQuery.subscribe();
    soldItemsSubscription.on('create', onItemSold);

    const itemsAddedQuery = new Moralis.Query('ItemsForSale');
    const itemsAddedQuerySubscription = await itemsAddedQuery.subscribe();
    itemsAddedQuerySubscription.on('create', onItemAdded);
}

onItemSold = async (item) => {
    const listing = document.getElementById(`item-${item.attributes.uid}`);
    if (listing){
        listing.parentNode.removeChild(listing);
    }
    
    user = await Moralis.User.current();
    if (user){
        const params = {uid: `${item.attributes.uid}`};
        const soldItem = await Moralis.Cloud.run('getItem', params);
        if (soldItem){
            if (user.get('accounts').includes(item.attributes.buyer)){
                getAndRenderItemData(soldItem, renderUserItem);
            }

            const userItemListing = document.getElementById(`user-item-${item.tokenObjectId}`);
            if (userItemListing) userItemListing.parentNode.removeChild(userItemListing);
          
        }
   
    }
}

onItemAdded = async (item) => {
    const params = {uid: `${item.attributes.uid}`};
    const addedItem = await Moralis.Cloud.run('getItem', params);
    if (addedItem){
        user = await Moralis.User.current();
        if (user){
            if (user.get('accounts').includes(addedItem.ownerOf)){
                const userItemListing = document.getElementById(`user-item-${item.tokenObjectId}`);
                if (userItemListing) userItemListing.parentNode.removeChild(userItemListing);

                getAndRenderItemData(addedItem, renderUserItem);
                return;
            }
        }
        getAndRenderItemData(addedItem, renderItem);
    }

}


loadUserItems2 = async () => {

    //  user = await Moralis.User.current();
    //  const userAddress = user.get('ethAddress');
    //  const options = { address: TOKEN_CONTRACT_ADDRESS , chain: "ropsten" };
    //  const nftOwners = await Moralis.Web3API.token.getNFTOwners(options);
    //  console.log(nftOwners);
    //  const tokens = nftOwners.result.filter(x => x.token_id == "2");
    //  console.log(tokens);

    const params =  { token_address: TOKEN_CONTRACT_ADDRESS };
    const userItems = await Moralis.Cloud.run("getUserItems", params);
    console.log(userItems);

    // const query = await new Moralis.Query("Item");
    // query.equalTo("nftContractAddress", TOKEN_CONTRACT_ADDRESS)
    // const queryResults = await query.find();
    // console.log(typeof queryResults);
    // console.log(queryResults);

}

initUser = async () => {
    if(await Moralis.User.current())
    {
        hideElement(userConnectButton);
        showElement( userProfileButton);
        showElement(OpenCreateItemButton);
        showElement(openUserItemsButton);
        loadUserItems();
    }
    else
    {
        showElement(userConnectButton);
        hideElement(userProfileButton );
        hideElement(OpenCreateItemButton);
        hideElement(openUserItemsButton);
    }
}

login = async () => {
    try{
        await Moralis.Web3.authenticate();
        initUser();
    }
    catch(error)
    {
        alert(error);
    }
}

logout = async () => {
    await Moralis.User.logOut();
    hideElement(userInfo);
    init();
}

openUserInfo = async () => {
    user = await Moralis.User.current();
    if(user){
        const email = user.get('email');
        if(email)
        {
            userEmailField.value = email;
        }
        else
        {
            userEmailField.value = "";
        }

        userUsernameField.value = user.get('username');

        const userAvatar = user.get('avatar');
        if(userAvatar)
        {
            userAvatarImg.src = userAvatar.url();
            showElement(userAvatarImg);
        }
        else
        {
            hideElement(userAvatarImg);
        }

        $(`#userInfo`).modal(`show`);
    }else{
        login();
    }
}

saveUserInfo = async () => {
    user.set('email', userEmailField.value);
    user.set('username', userUsernameField.value);

    if(userAvatarFile.files.length > 0)
    {
        const avatar = new Moralis.File("avatar.jpg", userAvatarFile.files[0]);
        user.set('avatar', avatar);
        alert("User info saved successfully!");
    }

    await user.save();
    openUserInfo();
}

createItem = async () => {
    if(CreateItemFile.files.length == 0)
    {
        alert("Please select a file!");
        return;
    }
    else if(CreateItemNameField.value.length == 0)
    {
        alert("Please give the item a name!");
        return;
    }

    const nftFile = new Moralis.File("ntfFile.jpg", CreateItemFile.files[0]);
    await nftFile.saveIPFS();

    const nftFilePath = nftFile.ipfs();

    const metadata = {
        name: CreateItemNameField.value,
        description: CreateItemDescriptionField.value,
        image: nftFilePath
    };

    const nftFileMetadataFile = new Moralis.File("metadata.json", {base64 : btoa(JSON.stringify(metadata))});
    await nftFileMetadataFile.saveIPFS();

    const nftFileMetadataFilePath = nftFileMetadataFile.ipfs();

    const nftId = await mintNft(nftFileMetadataFilePath);

    // Simple syntax to create a new subclass of Moralis.Object.
    const Item = Moralis.Object.extend("Item");

    user = await Moralis.User.current();
    const userAddress = user.get("ethAddress")

    switch(CreateItemStatusField.value){
        case "0":
            return;
        case "1":
            await ensureMarketplaceIsApproved(nftId, TOKEN_CONTRACT_ADDRESS);
            await marketplaceContract.methods.addItemToMarket(nftId, TOKEN_CONTRACT_ADDRESS, CreateItemPriceField.value).send({from: userAddress });
            break;
        case "2":
            alert("Not yet supported!");
            return;
    }
}

mintNft = async (metadataUrl) => {
    const receipt = await tokenContract.methods.createItem(metadataUrl).send({from: ethereum.selectedAddress});
    console.log(receipt);
    return receipt.events.Transfer.returnValues.tokenId;
}

openUserItems = async () => {
    user = await Moralis.User.current();
    if (user){    
        $(`#userItems`).modal(`show`);
    }else{
        login();
    }
}

loadUserItems = async () => {
    const params =  { token_address: TOKEN_CONTRACT_ADDRESS };
    const ownedItems = await Moralis.Cloud.run("getUserItems", params);
    ownedItems.forEach(item => {
        const userItemListing = document.getElementById(`user-item-${item.tokenObjectId}`);
        if (userItemListing) return;
        getAndRenderItemData(item, renderUserItem);
    });
}

loadItems = async () => {
    const params =  { token_address: TOKEN_CONTRACT_ADDRESS };
    const items = await Moralis.Cloud.run("getItems", params);
    user = await Moralis.User.current();
    items.forEach(item => {
        if(user){
            if(user.attributes.accounts.includes(item.ownerOf)) {
                const userItemListing = document.getElementById(`user-item-${item.tokenObjectId}`);
                if (userItemListing) userItemListing.parentNode.removeChild(userItemListing);
                //getAndRenderItemData(item, renderUserItem);
                return;
            }
        }
        getAndRenderItemData(item, renderItem);
    });
}

loadItems2 = async () => {
    const params =  { token_address: TOKEN_CONTRACT_ADDRESS };
    const items = await Moralis.Cloud.run("getItems", params);
    console.log(items);
}

initTemplate = (id) => {
    const template = document.getElementById(id);
    template.id = "";
    template.parentNode.removeChild(template);
    return template;
}

renderUserItem = async (item) => {
    const userItemListing = document.getElementById(`user-item-${item.tokenObjectId}`);
    if (userItemListing) return;

    const userItem = userItemTemplate.cloneNode(true);
    userItem.getElementsByTagName("img")[0].src = item.image;
    userItem.getElementsByTagName("img")[0].alt = item.name;
    userItem.getElementsByTagName("h5")[0].innerText = item.name;
    userItem.getElementsByTagName("p")[0].innerText = item.description;

    userItem.getElementsByTagName("input")[0].value = item.askingPrice ?? 1;
    userItem.getElementsByTagName("input")[0].disbaled = item.askingPrice > 0;
    userItem.getElementsByTagName("button")[0].disbaled = item.askingPrice > 0;
    userItem.getElementsByTagName("button")[0].onclick = async() => {
        user = await Moralis.User.current();
        if(!user){
            login();
            return;
        }
        await ensureMarketplaceIsApproved(item.tokenId, item.tokenAddress);
        await marketplaceContract.methods.addItemToMarket(item.tokenId, item.tokenAddress, userItem.getElementsByTagName("input")[0].value).send({from: user.get('ethAddress') });
    };


    userItems.id = `user-item-${item.tokenObjectId}`
    userItems.appendChild(userItem); 
    console.log(userItems);
}

renderItem = (item) => {
    const itemForSale = marketplaceItemTemplate.cloneNode(true);
    if (item.sellerAvatar){
        //itemForSale.getElementsByTagName("img")[0].src = item.sellerAvatar.url();
        //itemForSale.getElementsByTagName("img")[0].alt = item.sellerUsername;
        itemForSale.getElementsByTagName("span")[0].innerText = item.sellerUsername;
    }
    itemForSale.getElementsByTagName("img")[0].src = item.image;
    itemForSale.getElementsByTagName("img")[0].alt = item.name;
    itemForSale.getElementsByTagName("h5")[0].innerText = item.name;
    itemForSale.getElementsByTagName("p")[0].innerText = item.description;

    itemForSale.getElementsByTagName("button")[0].innerText = `Buy for ${item.askingPrice}`;
    itemForSale.getElementsByTagName("button")[0].onclick = ()  => buyItem(item);;
    itemForSale.id = `item-${item.uid}`;
    itemsForSale.appendChild(itemForSale);
}

getAndRenderItemData = (item, renderFunction) => {
    fetch(item.tokenUri)
    .then(response => response.json())
    .then(data => {
        item.name = data.name;
        item.description = data.description;
        item.image = data.image;
        renderFunction(item);
    })
}

ensureMarketplaceIsApproved = async (tokenId, tokenAddress) => {
    user = await Moralis.User.current();
    const userAddress = user.get("ethAddress")
    const contract = new web3.eth.Contract(tokenContractAbi, tokenAddress);
    const approvedAddress = await contract.methods.getApproved(tokenId).call({from: userAddress});
    if(approvedAddress != MARKETPLACE_CONTRACT_ADDRESS){
        await contract.methods.approve(MARKETPLACE_CONTRACT_ADDRESS, tokenId).send({from: userAddress});
    }
}

/*ensureMarketplaceIsApproved = async (tokenId, tokenAddress) => {
    user = await Moralis.User.current();
    const userAddress = user.get('ethAddress');
    const contract = new web3.eth.Contract(tokenContractAbi, tokenAddress);
    const approvedAddress = await contract.methods.getApproved(tokenId).call({from: userAddress});
    if (approvedAddress != MARKETPLACE_CONTRACT_ADDRESS){
        await contract.methods.approve(MARKETPLACE_CONTRACT_ADDRESS,tokenId).send({from: userAddress});
    }
}*/

ensureMarketplaceIsApproved = async (tokenId, tokenAddress) => {
    console.log(tokenId);
    user = await Moralis.User.current();
    const userAddress = user.get('ethAddress');
    const contract = new web3.eth.Contract(tokenContractAbi, tokenAddress);
    const approvedAddress = await contract.methods.getApproved(tokenId).call({from: userAddress});
    if (approvedAddress != MARKETPLACE_CONTRACT_ADDRESS){
        await contract.methods.approve(MARKETPLACE_CONTRACT_ADDRESS,tokenId).send({from: userAddress});
    }
}

buyItem = async (item) => {
    user = await Moralis.User.current();
    const userAddress = user.get("ethAddress")
    if(!user)
    {
        login();
        return;
    }
    await marketplaceContract.methods.buyItem(item.uid).send({from: user.get('ethAddress'), value: item.askingPrice});
}

hideElement = (element) => element.style.display = "none";
showElement = (element) => element.style.display = "block";

const userConnectButton = document.getElementById("btnConnect");
userConnectButton.onclick = login;

const userProfileButton = document.getElementById("btnUserInfo");
userProfileButton.onclick = openUserInfo;

const OpenCreateItemButton = document.getElementById("btnOpenCreateItem");
OpenCreateItemButton.onclick = () => $(`#createItem`).modal(`show`);

// User Profile../
const userInfo = document.getElementById("userInfo");
const userUsernameField = document.getElementById("txtUsername");
const userEmailField = document.getElementById("txtEmail");
const userAvatarImg = document.getElementById("imgAvatar");
const userAvatarFile = document.getElementById("fileAvatar");

document.getElementById("btnCloseUserInfo").onclick = () => hideElement(userInfo);
document.getElementById("btnLogout").onclick = logout;
document.getElementById("btnSaveUserInfo").onclick = saveUserInfo;

// Item Creation
const CreateItemForm = document.getElementById("createItem");

const CreateItemNameField = document.getElementById("txtCreateItemName");
const CreateItemDescriptionField = document.getElementById("txtCreateItemDescription");
const CreateItemPriceField = document.getElementById("txtCreateItemPrice");
const CreateItemStatusField = document.getElementById("selectCreateItemStatus");
const CreateItemFile = document.getElementById("fileCreateItemFile");

document.getElementById("btnCloseCreateItem").onclick = () => hideElement(CreateItemForm);
document.getElementById("btnCreateItem").onclick = createItem;

//User items
const userItemsSection = document.getElementById("userItems");
const userItems = document.getElementById("userItemsList");
document.getElementById("btnCloseUserItems").onclick = () => hideElement(userItemsSection);
const openUserItemsButton = document.getElementById("btnMyItems");
openUserItemsButton.onclick = openUserItems;

const userItemTemplate = initTemplate("itemTemplate");
const marketplaceItemTemplate = initTemplate("marketplaceItemTemplate");

//Items for sale

const itemsForSale = document.getElementById("itemsForSale");

init();