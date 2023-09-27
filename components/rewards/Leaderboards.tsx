import MedalIcon from '@components/icons/MedalIcon'
import ProfileImage from '@components/profile/ProfileImage'
import { ArrowLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid'
import { useViewport } from 'hooks/useViewport'
import { useState } from 'react'
import Select from '@components/forms/Select'
import { IconButton } from '@components/shared/Button'
import AcornIcon from '@components/icons/AcornIcon'
import WhaleIcon from '@components/icons/WhaleIcon'
import RobotIcon from '@components/icons/RobotIcon'
import MangoIcon from '@components/icons/MangoIcon'
import { useQuery } from '@tanstack/react-query'
import SheenLoader from '@components/shared/SheenLoader'
import { abbreviateAddress } from 'utils/formatting'
import { PublicKey } from '@solana/web3.js'
import { formatNumericValue } from 'utils/numbers'
import { useTranslation } from 'next-i18next'
import { fetchLeaderboard } from 'apis/rewards'
import { useCurrentSeason } from 'hooks/useRewards'
import Badge from './Badge'
import { tiers } from './RewardsPage'

const Leaderboards = ({
  goBack,
  leaderboard,
}: {
  goBack: () => void
  leaderboard: string
}) => {
  const { t } = useTranslation('rewards')
  const [topAccountsTier, setTopAccountsTier] = useState<string>(leaderboard)
  const renderTierIcon = (tier: string) => {
    if (tier === 'bot') {
      return <RobotIcon className="mr-2 h-5 w-5" />
    } else if (tier === 'mango') {
      return <MangoIcon className="mr-2 h-5 w-5" />
    } else if (tier === 'whale') {
      return <WhaleIcon className="mr-2 h-5 w-5" />
    } else return <AcornIcon className="mr-2 h-5 w-5" />
  }
  const { data: seasonData } = useCurrentSeason()

  const {
    data: topAccountsLeaderboardData,
    isFetching: fetchingRewardsLeaderboardData,
    isLoading: loadingRewardsLeaderboardData,
  } = useQuery(
    ['rewards-leaderboard-data', topAccountsTier],
    () => fetchLeaderboard(seasonData!.season_id),
    {
      cacheTime: 1000 * 60 * 10,
      staleTime: 1000 * 60,
      retry: 3,
      refetchOnWindowFocus: false,
      enabled: !!seasonData,
    },
  )
  const leadersForTier =
    topAccountsLeaderboardData?.find((x) => x.tier === topAccountsTier)
      ?.leaderboard || []

  const isLoading =
    fetchingRewardsLeaderboardData || loadingRewardsLeaderboardData

  return (
    <div className="mx-auto max-w-[1140px] flex-col items-center p-8 lg:p-10">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center">
          <IconButton className="mr-2" hideBg onClick={goBack} size="small">
            <ArrowLeftIcon className="h-5 w-5" />
          </IconButton>
          <h2 className="mr-4">Leaderboard</h2>
          <Badge
            label={`Season ${seasonData?.season_id}`}
            borderColor="var(--active)"
            shadowColor="var(--active)"
          />
        </div>
        <Select
          className="w-32"
          icon={renderTierIcon(topAccountsTier)}
          value={t(topAccountsTier)}
          onChange={(tier) => setTopAccountsTier(tier)}
        >
          {tiers.map((tier) => (
            <Select.Option key={tier} value={tier}>
              <div className="flex w-full items-center">
                {renderTierIcon(tier)}
                {t(tier)}
              </div>
            </Select.Option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        {!isLoading ? (
          leadersForTier && leadersForTier.length ? (
            leadersForTier.map((acc, i: number) => (
              <LeaderboardCard rank={i + 1} key={i} account={acc} />
            ))
          ) : (
            <div className="flex justify-center rounded-lg border border-th-bkg-3 p-8">
              <span className="text-th-fgd-3">Leaderboard not available</span>
            </div>
          )
        ) : (
          <div className="space-y-2">
            {[...Array(20)].map((x, i) => (
              <SheenLoader className="flex flex-1" key={i}>
                <div className="h-16 w-full bg-th-bkg-2" />
              </SheenLoader>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Leaderboards

const LeaderboardCard = ({
  rank,
  account,
}: {
  rank: number
  account: {
    mango_account: string
    tier: string
    total_points: number
  }
}) => {
  const { isTablet } = useViewport()
  const { mango_account, total_points } = account
  return (
    <a
      className="flex w-full items-center justify-between rounded-md border border-th-bkg-3 px-3 py-3 md:px-4 md:hover:bg-th-bkg-2"
      href={`/?address=${mango_account}`}
      rel="noopener noreferrer"
      target="_blank"
    >
      <div className="flex items-center space-x-3">
        <div
          className={`relative flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${
            rank < 4 ? '' : 'bg-th-bkg-3'
          } md:mr-2`}
        >
          <p
            className={`relative z-10 font-bold ${
              rank < 4 ? 'text-th-bkg-1' : 'text-th-fgd-3'
            }`}
          >
            {rank}
          </p>
          {rank < 4 ? <MedalIcon className="absolute" rank={rank} /> : null}
        </div>
        <ProfileImage
          imageSize={isTablet ? '32' : '40'}
          imageUrl={''}
          placeholderSize={isTablet ? '20' : '24'}
        />
        <div className="text-left">
          <p className="capitalize text-th-fgd-2 md:text-base">
            {abbreviateAddress(new PublicKey(mango_account))}
          </p>
          {/* <p className="text-xs text-th-fgd-4">
            Acc: {'A1at5'.slice(0, 4) + '...' + 'tt45eU'.slice(-4)}
          </p> */}
        </div>
      </div>
      <div className="flex items-center">
        <span className="mr-3 text-right font-mono md:text-base">
          {formatNumericValue(total_points)}
        </span>
        <ChevronRightIcon className="h-5 w-5 text-th-fgd-3" />
      </div>
    </a>
  )
}
