import { useQuery } from '@tanstack/react-query'
import {
  fetchAuctionHouse,
  fetchFilteredListing,
  fetchFilteredBids,
} from 'apis/market/auctionHouse'
import metaplexStore from '@store/metaplexStore'
import { Bid, LazyBid, LazyListing } from '@metaplex-foundation/js'

export const ALL_FILTER = 'All'
//10min
const refetchMs = 600000

export function useAuctionHouse() {
  const metaplex = metaplexStore((s) => s.metaplex)
  const criteria = metaplex?.cluster

  return useQuery(
    ['auctionHouse', criteria],
    () => fetchAuctionHouse(metaplex!),
    {
      enabled: !!metaplex,
      staleTime: refetchMs,
      retry: 1,
      refetchInterval: refetchMs,
    }
  )
}

export function useLazyListings(filter = ALL_FILTER) {
  const metaplex = metaplexStore((s) => s.metaplex)
  const { data } = useAuctionHouse()
  const criteria = metaplex && [
    data?.address.toBase58(),
    filter,
    metaplex.identity().publicKey.toBase58(),
  ]

  return useQuery(
    ['lazyListings', criteria],
    () => fetchFilteredListing(metaplex!, data!, filter),
    {
      enabled: !!(metaplex && data),
      staleTime: refetchMs,
      retry: 1,
      refetchInterval: refetchMs,
    }
  )
}

export function useListings(filter = ALL_FILTER) {
  const { data: lazyListings } = useLazyListings(filter)
  const metaplex = metaplexStore((s) => s.metaplex)
  const criteria = lazyListings
    ? [...lazyListings!.map((x) => x.tradeStateAddress.toBase58())]
    : []

  const loadMetadatas = async (lazyListings: LazyListing[]) => {
    const listingsWithMeta = []
    for (const listing of lazyListings) {
      const listingWithMeta = await metaplex!.auctionHouse().loadListing({
        lazyListing: {
          ...listing,
        },
        loadJsonMetadata: true,
      })

      listingsWithMeta.push({ ...listingWithMeta })
    }
    return listingsWithMeta
  }

  return useQuery(['listings', criteria], () => loadMetadatas(lazyListings!), {
    enabled: !!(metaplex && lazyListings),
    staleTime: refetchMs,
    retry: 1,
    refetchInterval: refetchMs,
  })
}

export function useBids() {
  const metaplex = metaplexStore((s) => s.metaplex)
  const { data } = useAuctionHouse()
  const criteria = metaplex && data?.address.toBase58()

  return useQuery(
    ['bids', criteria],
    () => fetchFilteredBids(metaplex!, data!),
    {
      enabled: !!(metaplex && data),
      staleTime: refetchMs,
      retry: 1,
      refetchInterval: refetchMs,
    }
  )
}

export function useLoadBids(lazyBids: LazyBid[]) {
  const metaplex = metaplexStore((s) => s.metaplex)
  const criteria = [...lazyBids.map((x) => x.createdAt.toNumber())]

  const loadBids = async (lazyBids: LazyBid[]) => {
    const bids: Bid[] = []
    for (const lazyBid of lazyBids) {
      const bid = await metaplex!.auctionHouse().loadBid({
        lazyBid: {
          ...lazyBid,
        },
        loadJsonMetadata: true,
      })

      bids.push({ ...bid })
    }
    return bids
  }

  return useQuery(['loadedBids', criteria], () => loadBids(lazyBids), {
    enabled: !!(metaplex && lazyBids.length),
    staleTime: refetchMs,
    retry: 1,
    refetchInterval: refetchMs,
  })
}
