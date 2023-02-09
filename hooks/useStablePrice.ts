import { I80F48, PerpMarket } from '@blockworks-foundation/mango-v4'
import { useMemo } from 'react'
import useMangoGroup from './useMangoGroup'
import useSelectedMarket from './useSelectedMarket'

const useStablePrice = () => {
  const { selectedMarket } = useSelectedMarket()
  const { group } = useMangoGroup()

  const banks = useMemo(() => {
    if (!group) return []
    return Array.from(group.banksMapByMint)
      .map(([mintAddress, banks]) => banks)
      .map((b) => b[0])
  }, [group])

  const stablePrice = useMemo(() => {
    if (!group || !selectedMarket || !banks.length) return 0
    let stablePrice
    if (selectedMarket instanceof PerpMarket) {
      stablePrice = selectedMarket.stablePriceModel.stablePrice
    } else {
      const baseBank = banks.find(
        (b) => b.tokenIndex === selectedMarket.baseTokenIndex
      )
      const quoteBank = banks.find(
        (b) => b.tokenIndex === selectedMarket.quoteTokenIndex
      )

      const baseStablePrice = group.toUiPrice(
        I80F48.fromNumber(baseBank!.stablePriceModel.stablePrice),
        baseBank!.mintDecimals
      )
      const quoteStablePrice = group.toUiPrice(
        I80F48.fromNumber(quoteBank!.stablePriceModel.stablePrice),
        quoteBank!.mintDecimals
      )
      stablePrice = baseStablePrice / quoteStablePrice
    }
    return stablePrice
  }, [banks, group, selectedMarket])

  return stablePrice
}

export default useStablePrice
