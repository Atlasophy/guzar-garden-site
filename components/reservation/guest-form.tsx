'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useLocale } from '@/components/shared/locale-provider';

export interface GuestFormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialRequests: string;
  privacyAccepted: boolean;
  marketingConsent: boolean;
}

interface GuestFormProps {
  defaultValues: GuestFormValues | null;
  onBack: () => void;
  onSubmit: (values: GuestFormValues) => void;
  /**
   * False when the venue has no SMS channel. The hint under the phone field is
   * the one place the site promises a confirmation text, so it is the one place
   * that has to stop promising it. Defaults to true so the prop is additive.
   */
  smsEnabled?: boolean;
}

const EMPTY_VALUES: GuestFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  specialRequests: '',
  privacyAccepted: false,
  marketingConsent: false,
};

export function GuestForm({
  defaultValues,
  onBack,
  onSubmit,
  smsEnabled = true,
}: GuestFormProps) {
  const { dictionary } = useLocale();
  const t = dictionary.reserve;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GuestFormValues>({ defaultValues: defaultValues ?? EMPTY_VALUES });

  useEffect(() => {
    reset(defaultValues ?? EMPTY_VALUES);
  }, [defaultValues, reset]);

  const message = (kind: 'required' | 'email' | 'phone' | 'privacy') => {
    if (kind === 'privacy') return t.privacyRequired;
    if (kind === 'email') return dictionary.errors.validation;
    if (kind === 'phone') return dictionary.errors.validation;
    return dictionary.common.required;
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="field-row">
        <label className={`field${errors.firstName ? ' invalid' : ''}`}>
          <span>{t.firstName}</span>
          <input
            autoComplete="given-name"
            aria-invalid={Boolean(errors.firstName)}
            {...register('firstName', {
              required: message('required'),
              maxLength: { value: 80, message: dictionary.errors.validation },
              validate: (value) => !/[<>\u0000-\u001f]/.test(value) || dictionary.errors.validation,
            })}
          />
          {errors.firstName ? <small className="error">{errors.firstName.message}</small> : null}
        </label>

        <label className={`field${errors.lastName ? ' invalid' : ''}`}>
          <span>{t.lastName}</span>
          <input
            autoComplete="family-name"
            aria-invalid={Boolean(errors.lastName)}
            {...register('lastName', {
              required: message('required'),
              maxLength: { value: 80, message: dictionary.errors.validation },
              validate: (value) => !/[<>\u0000-\u001f]/.test(value) || dictionary.errors.validation,
            })}
          />
          {errors.lastName ? <small className="error">{errors.lastName.message}</small> : null}
        </label>
      </div>

      <div className="field-row">
        <label className={`field${errors.email ? ' invalid' : ''}`}>
          <span>{t.email}</span>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            {...register('email', {
              maxLength: { value: 254, message: dictionary.errors.validation },
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: message('email'),
              },
            })}
          />
          {errors.email ? <small className="error">{errors.email.message}</small> : null}
        </label>

        <label className={`field${errors.phone ? ' invalid' : ''}`}>
          <span>{t.phone}</span>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+48 570 088 888"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby="guest-phone-hint"
            {...register('phone', {
              required: message('required'),
              minLength: { value: 7, message: message('phone') },
              maxLength: { value: 32, message: message('phone') },
            })}
          />
          <small className="note" id="guest-phone-hint">
            {smsEnabled ? t.phoneHint : t.phoneHintNoSms}
          </small>
          {errors.phone ? <small className="error">{errors.phone.message}</small> : null}
        </label>
      </div>

      <label className={`field${errors.specialRequests ? ' invalid' : ''}`}>
        <span>{t.specialRequests}</span>
        <textarea
          maxLength={500}
          aria-invalid={Boolean(errors.specialRequests)}
          aria-describedby="guest-requests-hint"
          {...register('specialRequests', {
            maxLength: { value: 500, message: dictionary.errors.validation },
          })}
        />
        <small className="note" id="guest-requests-hint">
          {t.specialRequestsHint}
        </small>
        {errors.specialRequests ? (
          <small className="error">{errors.specialRequests.message}</small>
        ) : null}
      </label>

      <label className="check">
        <input
          type="checkbox"
          aria-invalid={Boolean(errors.privacyAccepted)}
          {...register('privacyAccepted', { required: message('privacy') })}
        />
        <span>
          <Link href="/privacy" target="_blank">
            {t.privacyAccept}
          </Link>
        </span>
      </label>
      {errors.privacyAccepted ? (
        <p className="field invalid" role="alert">
          <small className="error">{errors.privacyAccepted.message}</small>
        </p>
      ) : null}

      <label className="check">
        <input type="checkbox" {...register('marketingConsent')} />
        <span>{t.marketingConsent}</span>
      </label>

      <div className="actions">
        <button type="submit" className="btn light" disabled={isSubmitting}>
          <span>{t.continue}</span>
        </button>
        <button type="button" className="btn outline" onClick={onBack} disabled={isSubmitting}>
          <span>{t.back}</span>
        </button>
      </div>
    </form>
  );
}
