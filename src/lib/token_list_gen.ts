import { TokenList } from '@uniswap/token-lists';
import { instantiateBridge } from './instantiate_bridge';
import { getAllTokens, getTokens } from './graph';

import { ArbTokenList, ArbTokenInfo, EtherscanList } from './types';
import {
  getL2TokenData,
  getL2TokenAddresses,
  getLogoUri,
  getTokenListObj,
  listNameToFileName,
  validateTokenList,
  sanitizeString
} from './utils';
import { writeFileSync, writeFile, readFileSync } from 'fs';

export interface ArbificationOptions {
  overwriteCurrentList: boolean;
}

export interface L2ToL1GatewayAddresses {
  [contractAddress: string]: string;
}
const l2ToL1GatewayAddresses: L2ToL1GatewayAddresses = {
  '0x09e9222e96e7b4ae2a407b98d48e330053351eee':
    '0xa3A7B6F88361F48403514059F1F16C8E78d60EeC',
  '0x096760f208390250649e3e8763348e783aef5562':
    '0xcEe284F754E854890e311e3280b767F80797180d',
  '0x6c411ad3e74de3e7bd422b94a27770f5b86c623b':
    '0xd92023E9d9911199a6711321D1277285e6d4e2db',
  '0x467194771dae2967aef3ecbedd3bf9a310c76c65':
    '0xD3B5b60020504bc3489D6949d545893982BA3011',
};

export const generateTokenList = async (
  _l1TokenAddresses: string[] | 'all',
  name: string,
  mainLogoUri?: string
) => {
  const bridgeData = await instantiateBridge();
  const { bridge, l1Network, l2Network } = bridgeData;
  const tokens =
    _l1TokenAddresses === 'all'
      ? await getAllTokens(l2Network.chainID)
      : await getTokens(_l1TokenAddresses, l2Network.chainID);
  const l1TokenAddresses = tokens.map((token: any) => token.id);
  const l2Addresses = await getL2TokenAddresses(l1TokenAddresses, bridge);
  const tokenData = await getL2TokenData(l2Addresses, bridge);
  const logoUris: (string | undefined)[] = [];
  for (const token of tokens) {
    const uri = await getLogoUri(token.id);
    logoUris.push(uri);
  }

  const tokenList = tokens.map((token: any, i: number) => {
    const l2GatewayAddress = token.gateway[0].id.slice(0, 42) as string;
    const address = l2Addresses[i];
    let { name:_name, decimals, symbol:_symbol } = tokenData[i];
    const name = sanitizeString(_name)
    const symbol = sanitizeString(_symbol)

    let arbTokenInfo = {
      chainId: +l2Network.chainID,
      address: address,
      name,
      symbol,
      decimals,
      extensions: {
        l1Address: token.id,
        l2GatewayAddress,
        l1GatewayAddress: l2ToL1GatewayAddresses[l2GatewayAddress],
      },
    };
    if (logoUris[i]) {
      arbTokenInfo = { ...{ logoURI: logoUris[i] }, ...arbTokenInfo };
    }

    return arbTokenInfo;
  }).filter((tokenInfo: ArbTokenInfo)=>{
    return tokenInfo.extensions.l2GatewayAddress !== "0x0000000000000000000000000000000000000001" 
  })
  //   @ts-ignore
  tokenList.sort((a, b) => (a.symbol < b.symbol ? -1 : 1));
  const arbTokenList: ArbTokenList = {
    name: sanitizeString(`Arbed ${name}`.slice(0,19)),
    timestamp: new Date().toISOString(),
    version: {
      major: 1,
      minor: 0,
      patch: 0,
    },
    tokens: tokenList,
    logoURI: mainLogoUri // todo: handle undefined
  };
  const res = validateTokenList(arbTokenList);
  if(!res){
    console.log(arbTokenList);    
    throw new Error("New token list invalid!")
  }
  console.log(`Generated list with ${arbTokenList.tokens.length} tokens`);
  
  return arbTokenList;
};

export const arbifyL1List = async (pathOrUrl: string) => {
  const l1TokenList = await getTokenListObj(pathOrUrl);

  const l1Addresses = l1TokenList.tokens.map((token) =>
    token.address.toLowerCase()
  );

  const newList = await generateTokenList(l1Addresses, l1TokenList.name, l1TokenList.logoURI);
  const path =
    process.env.PWD +
    '/src/ArbTokenLists/' +
    listNameToFileName(l1TokenList.name);

  writeFileSync(path, JSON.stringify(newList));
};

export const updateArbifiedList = async (path: string) => {
  const data = readFileSync(path);
  const tokenList = JSON.parse(data.toString()) as ArbTokenList;
  // const tokenList  = getTokenListObj(path)
  // TODO

  const l1Addresses = tokenList.tokens
    .map((token) => token.extensions.l1Address)
    .filter((x): x is string => !!x);
  const newList = await generateTokenList(l1Addresses, tokenList.name, tokenList.logoURI);
  writeFileSync(path, JSON.stringify(newList));
};

export const arbListtoEtherscanList = (arbList: ArbTokenList): EtherscanList=> {
  return arbList.tokens.map((tokenInfo)=>{
    const { address: l2Address} =  tokenInfo;
    const {  l1Address, l1GatewayAddress, l2GatewayAddress} = tokenInfo.extensions
    return {
      l1Address,
      l2Address,
      l1GatewayAddress,
      l2GatewayAddress
    }
  })
}
