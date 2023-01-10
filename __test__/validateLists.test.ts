import { yargsInstance } from '../src/main';
import { handler as handlerUpdate } from '../src/commands/update';
import { handler as handlerArbify } from '../src/commands/arbify';
import { handler as handlerFull } from '../src/commands/full';
import { Action, Args } from '../src/lib/options';
import { ArbTokenList, EtherscanList } from '../src/lib/types';

const handlers: {
  [action in Action]?: (argv: Args) => Promise<ArbTokenList | EtherscanList>;
} = {
  [Action.Update]: handlerUpdate,
  [Action.Arbify]: handlerArbify,
  [Action.Full]: handlerFull,
};
const runCommand = async (command: Action, options: string[]) => {
  const argv = await yargsInstance.parseAsync(['_', command, ...options]);
  return handlers[command]!(argv);
};
const compareLists = (
  l1: ArbTokenList | EtherscanList,
  l2: ArbTokenList | EtherscanList
) => {
  // Both lists are EtherscanList
  if ('timestamp' in l1 && 'timestamp' in l2) {
    const { timestamp: t1, version: v1, ...list1 } = l1;
    const { timestamp: t2, version: v2, ...list2 } = l2;
    return expect(list1).toStrictEqual(list2);
  }

  return expect(l1).toStrictEqual(l2);
};

describe('Token Lists', () => {
  describe('Arbify token lists', () => {
    jest.setTimeout(100_000);

    it('Arb1 Uniswap', async () => {
      const [localList, onlineList] = await Promise.all([
        runCommand(Action.Arbify, [
          '--l2NetworkID=42161',
          '--tokenList=https://gateway.ipfs.io/ipns/tokens.uniswap.org',
          '--ignorePreviousList=true',
        ]),
        fetch(
          'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_uniswap_labs_list.json'
        ).then(response => response.json()),
      ]);

      expect(compareLists(localList, onlineList)).toBeTruthy();
    });

    it('Arb1 Gemini', async () => {
      const [localList, onlineList] = await Promise.all([
        runCommand(Action.Arbify, [
          '--l2NetworkID=42161',
          '--tokenList=https://www.gemini.com/uniswap/manifest.json',
          '--ignorePreviousList=true',
        ]),
        fetch(
          'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_gemini_token_list.json'
        ).then(response => response.json()),
      ]);

      expect(compareLists(localList, onlineList)).toBeTruthy();
    });

    it('Arb1 CMC', async () => {
      const [localList, onlineList] = await Promise.all([
        runCommand(Action.Arbify, [
          '--l2NetworkID=42161',
          '--tokenList=https://api.coinmarketcap.com/data-api/v3/uniswap/all.json',
          '--ignorePreviousList=true',
        ]),
        fetch(
          'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_coinmarketcap.json'
        ).then(response => response.json()),
      ]);

      expect(compareLists(localList, onlineList)).toBeTruthy();
    });

    it('Arb Nova Uniswap', async () => {
      const [localList, onlineList] = await Promise.all([
        runCommand(Action.Arbify, [
          '--l2NetworkID=42170',
          '--tokenList=https://gateway.ipfs.io/ipns/tokens.uniswap.org',
          '--ignorePreviousList=true',
        ]),
        fetch(
          'https://tokenlist.arbitrum.io/ArbTokenLists/42170_arbed_uniswap_labs_default.json'
        ).then(response => response.json()),
      ]);

      expect(compareLists(localList, onlineList)).toBeTruthy();
    });

    it('Arb Nova Gemini', async () => {
      const [localList, onlineList] = await Promise.all([
        runCommand(Action.Arbify, [
          '--l2NetworkID=42170',
          '--tokenList=https://www.gemini.com/uniswap/manifest.json',
          '--ignorePreviousList=true',
        ]),
        fetch(
          'https://tokenlist.arbitrum.io/ArbTokenLists/42170_arbed_gemini_token_list.json'
        ).then(response => response.json()),
      ]);

      expect(compareLists(localList, onlineList)).toBeTruthy();
    });

    it('Arb Nova CMC', async () => {
      const [localList, onlineList] = await Promise.all([
        runCommand(Action.Arbify, [
          '--l2NetworkID=42170',
          '--tokenList=https://api.coinmarketcap.com/data-api/v3/uniswap/all.json',
          '--ignorePreviousList=true',
        ]),
        fetch(
          'https://tokenlist.arbitrum.io/ArbTokenLists/42170_arbed_coinmarketcap.json'
        ).then(response => response.json()),
      ]);

      expect(compareLists(localList, onlineList)).toBeTruthy();
    });

    it('Arb Goerli CMC', async () => {
      const [localList, onlineList] = await Promise.all([
        runCommand(Action.Arbify, [
          '--l2NetworkID=421613',
          '--tokenList=https://api.coinmarketcap.com/data-api/v3/uniswap/all.json',
          '--ignorePreviousList=true',
        ]),
        fetch(
          'https://tokenlist.arbitrum.io/ArbTokenLists/421613_arbed_coinmarketcap.jso'
        ).then(response => response.json()),
      ]);

      expect(compareLists(localList, onlineList)).toBeTruthy();
    });
  });

  describe('Update token lists', () => {
    jest.setTimeout(100_000);
    it('should return the same list as the online version', async () => {
      const [localList, onlineList] = await Promise.all([
        runCommand(Action.Update, [
          '--l2NetworkID=42161',
          '--tokenList=https://tokenlist.arbitrum.io/ArbTokenLists/arbed_arb_whitelist_era.json',
          '--includeOldDataFields=true',
        ]),
        fetch(
          'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_arb_whitelist_era.json'
        ).then(response => response.json()),
      ]);

      expect(compareLists(localList, onlineList)).toBeTruthy();
    });
  });

  describe('fullList', () => {
    jest.setTimeout(40_000);

    it('should generate fullList for a given network', async () => {
      const [localList, onlineList] = await Promise.all([
        runCommand(Action.Full, [
          '--l2NetworkID=42161',
          '--tokenList=full',
          '--ignorePreviousList=true',
        ]),
        fetch('https://tokenlist.arbitrum.io/FullList/all_tokens.json').then(
          response => response.json()
        ),
      ]);

      expect(compareLists(localList, onlineList)).toBeTruthy();
    });
  });
});
