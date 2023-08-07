import mangoStore from '@store/mangoStore'
import useMangoAccount from 'hooks/useMangoAccount'
import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import NumberFormat, {
  NumberFormatValues,
  SourceInfo,
} from 'react-number-format'
import { isMangoError } from 'types'
import { notify } from 'utils/notifications'
import Tooltip from '../shared/Tooltip'
import Button, { LinkButton } from '../shared/Button'
import Loading from '../shared/Loading'
import InlineNotification from '../shared/InlineNotification'
import Modal from '@components/shared/Modal'
import { ModalProps } from 'types/modal'
import Label from '@components/forms/Label'
import {
  getAvaialableAccountsColor,
  getTotalMangoAccountAccounts,
  getUsedMangoAccountAccounts,
} from '@components/settings/AccountSettings'

const MIN_ACCOUNTS = 8
const MAX_ACCOUNTS = '16'

const INPUT_CLASSES =
  'h-10 rounded-md border w-full border-th-input-border bg-th-input-bkg px-3 font-mono text-base text-th-fgd-1 focus:border-th-fgd-4 focus:outline-none md:hover:border-th-input-border-hover'

type FormErrors = Partial<Record<keyof AccountSizeForm, string>>

type AccountSizeForm = {
  tokenAccounts: string | undefined
  spotOpenOrders: string | undefined
  perpAccounts: string | undefined
  perpOpenOrders: string | undefined
  [key: string]: string | undefined
}

const DEFAULT_FORM = {
  tokenAccounts: '',
  spotOpenOrders: '',
  perpAccounts: '',
  perpOpenOrders: '',
}

const MangoAccountSizeModal = ({ isOpen, onClose }: ModalProps) => {
  const { t } = useTranslation(['common', 'settings'])
  const { mangoAccount, mangoAccountAddress } = useMangoAccount()
  const [accountSizeForm, setAccountSizeForm] =
    useState<AccountSizeForm>(DEFAULT_FORM)
  const [formErrors, setFormErrors] = useState<FormErrors>()
  const [submitting, setSubmitting] = useState(false)

  const [availableTokens, availableSerum3, availablePerps, availablePerpOo] =
    useMemo(() => {
      const [usedTokens, usedSerum3, usedPerps, usedPerpOo] =
        getUsedMangoAccountAccounts(mangoAccountAddress)
      const [totalTokens, totalSerum3, totalPerps, totalPerpOpenOrders] =
        getTotalMangoAccountAccounts(mangoAccountAddress)
      return [
        <span
          className={getAvaialableAccountsColor(usedTokens, totalTokens)}
          key="tokenAccounts"
        >{`${usedTokens}/${totalTokens}`}</span>,
        <span
          className={getAvaialableAccountsColor(usedSerum3, totalSerum3)}
          key="spotOpenOrders"
        >{`${usedSerum3}/${totalSerum3}`}</span>,
        <span
          className={getAvaialableAccountsColor(usedPerps, totalPerps)}
          key="perpAccounts"
        >{`${usedPerps}/${totalPerps}`}</span>,
        <span
          className={getAvaialableAccountsColor(
            usedPerpOo,
            totalPerpOpenOrders,
          )}
          key="perpOpenOrders"
        >{`${usedPerpOo}/${totalPerpOpenOrders}`}</span>,
      ]
    }, [mangoAccountAddress])

  useEffect(() => {
    if (mangoAccountAddress) {
      setAccountSizeForm({
        tokenAccounts: mangoAccount?.tokens.length.toString(),
        spotOpenOrders: mangoAccount?.serum3.length.toString(),
        perpAccounts: mangoAccount?.perps.length.toString(),
        perpOpenOrders: mangoAccount?.perpOpenOrders.length.toString(),
      })
    }
  }, [mangoAccountAddress])

  const isFormValid = (form: AccountSizeForm) => {
    const mangoAccount = mangoStore.getState().mangoAccount.current
    const invalidFields: FormErrors = {}
    setFormErrors({})
    const { tokenAccounts, spotOpenOrders, perpAccounts, perpOpenOrders } = form

    if (tokenAccounts) {
      const minTokenAccountsLength = mangoAccount?.tokens.length || MIN_ACCOUNTS
      if (parseInt(tokenAccounts) < minTokenAccountsLength) {
        invalidFields.tokenAccounts = t('settings:error-amount', {
          type: t('settings:token-accounts'),
          greaterThan: mangoAccount?.tokens.length,
          lessThan: '17',
        })
      }
    }
    if (spotOpenOrders) {
      const minSpotOpenOrdersLength =
        mangoAccount?.serum3.length || MIN_ACCOUNTS
      if (parseInt(spotOpenOrders) < minSpotOpenOrdersLength) {
        invalidFields.spotOpenOrders = t('settings:error-amount', {
          type: t('settings:spot-open-orders'),
          greaterThan: mangoAccount?.serum3.length,
          lessThan: '17',
        })
      }
    }
    if (perpAccounts) {
      const minPerpAccountsLength = mangoAccount?.perps.length || MIN_ACCOUNTS
      if (parseInt(perpAccounts) < minPerpAccountsLength) {
        invalidFields.perpAccounts = t('settings:error-amount', {
          type: t('settings:perp-accounts'),
          greaterThan: mangoAccount?.perps.length,
          lessThan: '17',
        })
      }
    }
    if (perpOpenOrders) {
      const minPerpOpenOrdersLength =
        mangoAccount?.perpOpenOrders.length || MIN_ACCOUNTS
      if (parseInt(perpOpenOrders) < minPerpOpenOrdersLength) {
        invalidFields.perpOpenOrders = t('settings:error-amount', {
          type: t('settings:perp-open-orders'),
          greaterThan: mangoAccount?.perpOpenOrders.length,
          lessThan: '17',
        })
      }
    }
    if (Object.keys(invalidFields).length) {
      setFormErrors(invalidFields)
    }
    return invalidFields
  }

  const handleMax = (propertyName: keyof AccountSizeForm) => {
    setFormErrors({})
    setAccountSizeForm((prevState) => ({
      ...prevState,
      [propertyName]: MAX_ACCOUNTS,
    }))
  }

  // const handleMaxAll = () => {
  //   setFormErrors({})
  //   const newValues = { ...accountSizeForm }
  //   for (const key in newValues) {
  //     newValues[key] = MAX_ACCOUNTS
  //   }
  //   setAccountSizeForm(newValues)
  // }

  const handleSetForm = (
    propertyName: keyof AccountSizeForm,
    e: NumberFormatValues,
    info: SourceInfo,
  ) => {
    if (info.source !== 'event') return
    setFormErrors({})
    setAccountSizeForm((prevState) => ({
      ...prevState,
      [propertyName]: e.value,
    }))
  }

  const handleUpdateAccountSize = useCallback(async () => {
    const invalidFields = isFormValid(accountSizeForm)
    if (Object.keys(invalidFields).length) {
      return
    }
    const client = mangoStore.getState().client
    const group = mangoStore.getState().group
    const mangoAccount = mangoStore.getState().mangoAccount.current
    const actions = mangoStore.getState().actions
    const { tokenAccounts, spotOpenOrders, perpAccounts, perpOpenOrders } =
      accountSizeForm
    if (
      !mangoAccount ||
      !group ||
      !tokenAccounts ||
      !spotOpenOrders ||
      !perpAccounts ||
      !perpOpenOrders
    )
      return
    setSubmitting(true)
    try {
      const tx = await client.accountExpandV2(
        group,
        mangoAccount,
        parseInt(tokenAccounts),
        parseInt(spotOpenOrders),
        parseInt(perpAccounts),
        parseInt(perpOpenOrders),
        mangoAccount.tokenConditionalSwaps.length,
      )
      notify({
        title: 'Transaction confirmed',
        type: 'success',
        txid: tx,
      })
      await actions.reloadMangoAccount()
      setSubmitting(false)
    } catch (e) {
      console.error(e)
      if (!isMangoError(e)) return
      notify({
        title: 'Transaction failed',
        description: e.message,
        txid: e.txid,
        type: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }, [accountSizeForm])

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <>
        <h2 className="mb-2 text-center">{t('settings:account-size')}</h2>
        {/* <LinkButton className="font-normal mb-0.5" onClick={handleMaxAll}>
            {t('settings:max-all')}
          </LinkButton> */}
        <p className="mb-4 text-center text-xs">
          {t('settings:account-size-desc')}
        </p>
        <div className="mb-4">
          <AccountSizeFormInput
            availableAccounts={availableTokens}
            error={formErrors?.tokenAccounts}
            label={t('settings:token-accounts')}
            handleMax={() => handleMax('tokenAccounts')}
            handleSetForm={handleSetForm}
            tooltipContent={t('settings:tooltip-token-accounts')}
            type="tokenAccounts"
            value={accountSizeForm.tokenAccounts}
          />
        </div>
        <div className="mb-4">
          <AccountSizeFormInput
            availableAccounts={availableSerum3}
            error={formErrors?.spotOpenOrders}
            label={t('settings:spot-open-orders')}
            handleMax={() => handleMax('spotOpenOrders')}
            handleSetForm={handleSetForm}
            tooltipContent={t('settings:tooltip-spot-open-orders')}
            type="spotOpenOrders"
            value={accountSizeForm.spotOpenOrders}
          />
        </div>
        <div className="mb-4">
          <AccountSizeFormInput
            availableAccounts={availablePerps}
            error={formErrors?.perpAccounts}
            label={t('settings:perp-accounts')}
            handleMax={() => handleMax('perpAccounts')}
            handleSetForm={handleSetForm}
            tooltipContent={t('settings:tooltip-perp-accounts')}
            type="perpAccounts"
            value={accountSizeForm.perpAccounts}
          />
        </div>
        <div>
          <AccountSizeFormInput
            availableAccounts={availablePerpOo}
            error={formErrors?.perpOpenOrders}
            label={t('settings:perp-open-orders')}
            handleMax={() => handleMax('perpOpenOrders')}
            handleSetForm={handleSetForm}
            tooltipContent={t('settings:tooltip-perp-open-orders')}
            type="perpOpenOrders"
            value={accountSizeForm.perpOpenOrders}
          />
        </div>
        <Button
          className="w-full mb-4 mt-6 flex items-center justify-center"
          onClick={handleUpdateAccountSize}
          size="large"
        >
          {submitting ? <Loading /> : t('settings:increase-account-size')}
        </Button>
        <LinkButton className="mx-auto" onClick={onClose}>
          {t('cancel')}
        </LinkButton>
      </>
    </Modal>
  )
}

export default MangoAccountSizeModal

const AccountSizeFormInput = ({
  availableAccounts,
  error,
  label,
  handleMax,
  handleSetForm,
  tooltipContent,
  type,
  value,
}: {
  availableAccounts: ReactNode
  error: string | undefined
  label: string
  handleMax: (type: keyof AccountSizeForm) => void
  handleSetForm: (
    type: keyof AccountSizeForm,
    values: NumberFormatValues,
    info: SourceInfo,
  ) => void
  tooltipContent: string
  type: keyof AccountSizeForm
  value: string | undefined
}) => {
  const { t } = useTranslation(['common', 'settings'])
  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Tooltip content={tooltipContent}>
            <Label className="mr-1 tooltip-underline" text={label} />
          </Tooltip>
        </div>
        <LinkButton
          className="mb-2 font-normal"
          onClick={() => handleMax('tokenAccounts')}
        >
          {t('max')}
        </LinkButton>
      </div>
      <div className="relative">
        <NumberFormat
          name="tokenAccounts"
          id="tokenAccounts"
          inputMode="numeric"
          thousandSeparator=","
          allowNegative={false}
          isNumericString={true}
          className={INPUT_CLASSES}
          value={value}
          onValueChange={(e, sourceInfo) => handleSetForm(type, e, sourceInfo)}
        />
        <div className="absolute top-0 right-0 flex items-center border border-l-0 border-th-input-border rounded-r h-10 px-2 bg-th-input-bkg">
          <p className="font-mono text-xs">{availableAccounts}</p>
        </div>
      </div>
      {error ? (
        <div className="mt-1">
          <InlineNotification
            type="error"
            desc={error}
            hideBorder
            hidePadding
          />
        </div>
      ) : null}
    </>
  )
}