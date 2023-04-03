/* eslint-disable @typescript-eslint/no-explicit-any */
import { Serum3Market } from '@blockworks-foundation/mango-v4'
import mangoStore from '@store/mangoStore'
import { useQuery } from '@tanstack/react-query'
import { makeApiRequest } from 'apis/birdeye/helpers'

interface PriceResponse {
  address: string
  unixTime: number
  value: number
}

const fetchBirdeyePrices = async (
  spotMarkets: Serum3Market[]
): Promise<{ data: PriceResponse[]; mint: string }[]> => {
  const mints = spotMarkets.map((market) =>
    market.serumMarketExternal.toString()
  )

  const promises: any = []
  for (const mint of mints) {
    const queryEnd = Math.floor(Date.now() / 1000)
    const queryStart = queryEnd - 86400
    const query = `defi/history_price?address=${mint}&address_type=pair&type=30m&time_from=${queryStart}&time_to=${queryEnd}`
    promises.push(makeApiRequest(query))
  }

  const responses = await Promise.all(promises)
  if (responses.length) {
    return responses.map((res) => ({
      data: res.data.items,
      mint: res.data.items[0].address,
    }))
  }

  return []
}

export const useBirdeyeMarketPrices = () => {
  const spotMarkets = mangoStore((s) => s.serumMarkets)
  const res = useQuery<any[], Error>(
    ['birdeye-market-prices'],
    () => fetchBirdeyePrices(spotMarkets),
    {
      cacheTime: 1000 * 60 * 15,
      staleTime: 1000 * 60 * 10,
      retry: 3,
      enabled: !!spotMarkets?.length,
      refetchOnWindowFocus: false,
    }
  )

  return {
    isLoading: res?.isLoading,
    data: res?.data || [],
  }
}
