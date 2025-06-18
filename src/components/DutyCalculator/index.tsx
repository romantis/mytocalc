import {
  createSignal,
  createMemo,
  createEffect,
  onMount,
  onCleanup,
  Show,
  type Accessor,
  For,
  createResource,
} from "solid-js";
import {translator, type NullableTranslator} from '@solid-primitives/i18n';

import { calcDuty, type DutyResult } from "../../lib/calc";
import { convert, getCurrencyMeta, getMoneyFormatter, type Currency, type CurrencyMeta } from "../../lib/currency";
import { fetchDictionary, type Dictionary, type Locale } from "../../i18n/i18n";


interface DutyCalculatorProps {
  rates: Record<string, number>;
  asOf: string; // 16.06.2025'
  /** Optional initial state pulled from URL‑params on SSR */
  initialAmount?: number;
  initialCurrency?: Currency;
  initialDraftLaw?: boolean;
  lang?: Locale; // default: 'uk'
}
export default function DutyCalculator(props: DutyCalculatorProps) {
  /* ---------------------------- state ---------------------------- */
  const [lang] = createSignal(props.lang ?? 'uk');
  const locale = createMemo(() => lang() === 'uk' ? 'uk-UA' : 'en-US');
  const currencyMeta = createMemo(() => getCurrencyMeta(locale()));
  const [dict] = createResource(lang, fetchDictionary);
  dict();
  const t = translator(dict);

  const [amountRaw, setAmountRaw] = createSignal<string>(
    props.initialAmount?.toString() ?? ""
  );
  const [currency, setCurrency] = createSignal<Currency>(
    props.initialCurrency ?? "EUR"
  );

  const rate = createMemo(() => props.rates[currency()] ?? 1); // default to 1 if not provided

  const [draftLaw, setDraftLaw] = createSignal<boolean>(
    props.initialDraftLaw ?? false
  );

  const [displayCur, setDisplayCur] = createSignal<Currency>("UAH"); // default ₴

  const [isAnimating, setIsAnimating] = createSignal(false);

  const amountEur = createMemo(() => {
    const val = parseFloat(amountRaw());
    if (isNaN(val) || val <= 0) return 0;

    if (currency() === "EUR") return val;
    if (currency() === "UAH") return val / props.rates["EUR"]; // UAH → EUR

    const rateToUah = props.rates[currency()];
    const eurRate = props.rates["EUR"];
    return rateToUah && eurRate ? (val * rateToUah) / eurRate : 0;
  });

  const duty = createMemo<DutyResult>(() => calcDuty(amountEur(), draftLaw()));

  const converted = createMemo(() => {
  const cur = displayCur();
    return {
      duty: convert(duty().duty,  "EUR", cur, props.rates),
      vat:  convert(duty().vat,   "EUR", cur, props.rates),
      total: convert(duty().total,"EUR", cur, props.rates),
    };
  });
  const moneyFmt = createMemo(() => getMoneyFormatter(displayCur(), locale()));

  /* ----------------------------- URL syncing ----------------------------- */
  const syncUrl = () => {
    const q = new URLSearchParams();
    if (amountRaw()) q.set("amount", amountRaw());
    if (currency()) q.set("currency", currency());
    if (draftLaw()) q.set("draft", "1");
    if (displayCur() !== "UAH") q.set("out", displayCur());
    window.history.replaceState({}, "", `?${q.toString()}`);
  };

  /** Populate initial state from URL once on mount */
  onMount(() => {
    const q = new URLSearchParams(window.location.search);
    q.get("amount") && setAmountRaw(q.get("amount")!);
    const cur = q.get("currency");
    const out = q.get("out");
    if (cur && (cur as Currency) in currencyMeta()) setCurrency(cur as Currency);
    if (out && (out as Currency) in currencyMeta())
      setDisplayCur(out as Currency);
    if (q.get("draft") === "1") setDraftLaw(true);
  });

  /* Trigger share animation on amount change */
  let animTimer: number | undefined;
  createEffect(() => {
    clearTimeout(animTimer);
    if (amountRaw() && parseFloat(amountRaw()) > 0) {
      setIsAnimating(true);
      animTimer = window.setTimeout(() => setIsAnimating(false), 300);
    }
  });
  onCleanup(() => clearTimeout(animTimer));

  /* Re‑sync URL when any public field mutates */
  createEffect(() => {
    amountRaw();
    currency();
    draftLaw();
    displayCur();
    syncUrl();
  });

  /* ------------------------------- helpers ------------------------------ */
  const hasResult = () => amountEur() > 0;
  const isFree = () => hasResult() && duty().total === 0;

  /* ------------------------------- share ------------------------------- */
  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert("Посилання скопійовано у буфер обміну");
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <div class="grid md:grid-cols-2 gap-2 md:gap-8">
      {/* Calculator Form */}

        <CalculatorForm
          rate={rate}
          asOf={props.asOf}
          amountRaw={amountRaw}
          currency={currency}
          draftLaw={draftLaw}
          onAmount={setAmountRaw}
          onCurrency={setCurrency}
          onDraftToggle={setDraftLaw}
          meta={currencyMeta()}
          t={t}
        />

      {/* Results */}
      <div class="space-y-6">
        {/* Main Result Card */}
        <div
          class={`bg-white rounded-3xl p-4 md:p-8 shadow-xl border transition-all duration-500 ${
            hasResult()
              ? isFree()
                ? "shadow-green-100/50 border-green-200/50 bg-gradient-to-br from-white to-green-50/30"
                : "shadow-red-100/50 border-red-200/50 bg-gradient-to-br from-white to-red-50/30"
              : "shadow-gray-100/50 border-gray-200/50"
          } ${isAnimating() ? "scale-[1.02]" : "scale-100"}`}
        >
          <div class="flex items-center justify-between mb-3 md:mb-6">
            <h2 class="text-2xl font-bold text-gray-900 flex items-center gap-2 md:gap-3">
              <div
                class={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  hasResult()
                    ? isFree()
                      ? "bg-green-100"
                      : "bg-red-100"
                    : "bg-gray-100"
                }`}
              >
                <svg
                  class={`w-5 h-5 transition-colors ${
                    hasResult()
                      ? isFree()
                        ? "text-green-600"
                        : "text-red-600"
                      : "text-gray-400"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              {t('result')}
            </h2>

            <Show when={hasResult()}>
              <div
                class={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  isFree()
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {isFree() ? t('free') : t('has_pay')}
              </div>
            </Show>
          </div>

          <Show
            when={hasResult()}
            fallback={
              <div class="text-center py-6 md:py-12">
                <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    class="w-8 h-8 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                </div>
                <p class="text-gray-500 font-medium">
                  {t('enter_value')}
                </p>
              </div>
            }
          >
            <div class="space-y-2 md:space-y-4">
              {/* Breakdown */}
              <div class="space-y-3">
                <div class="flex justify-between items-center py-2 md:py-3 border-b border-gray-100">
                  <span class="text-gray-600 font-medium">{t('import_duty')}</span>
                  <span class="text-lg font-bold text-gray-900">
                    {moneyFmt().format(converted().duty)}
                  </span>
                </div>
                <div class="flex justify-between items-center py-2 md:py-3 border-b border-gray-100">
                  <span class="text-gray-600 font-medium">{t('vat')}</span>
                  <span class="text-lg font-bold text-gray-900">
                    {moneyFmt().format(converted().vat)}
                  </span>
                </div>
              </div>

              {/* Total */}
              <div
                class={`rounded-2xl p-3 md:p-6 ${
                  isFree()
                    ? "bg-green-50 border-2 border-green-200"
                    : "bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200"
                }`}
              >
                <div class="flex justify-between items-center">
                  <span
                    class={`text-lg font-bold ${
                      isFree() ? "text-green-800" : "text-red-800"
                    }`}
                  >
                    {t('total')}
                  </span>
                  <output
                    aria-live="polite"
                    class={`text-3xl font-black ${
                      isFree() ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {isNaN(converted().total)
                      ? "—"
                      : moneyFmt().format(converted().total)}
                  </output>
                </div>
              </div>

              {/* Info */}
              <Show when={isFree()}>
                <div class="bg-brand-50 rounded-xl p-4 border border-brand-200">
                  <div class="flex gap-3">
                    <svg
                      class="w-5 h-5 text-brand-600 mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p class="text-sm text-brand-800">
                      {t('no_duty_message')}
                    </p>
                  </div>
                </div>
              </Show>
            </div>
          </Show>
        </div>

        {/* Share Button */}
        <Show when={hasResult()}>
          <button
            onClick={share}
            class="w-full bg-gradient-to-r from-brand-600 to-sky-600 hover:from-brand-700 hover:to-sky-700 
                         text-white font-bold py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl 
                         transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]
                         flex items-center justify-center gap-3"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
              />
            </svg>
            {t('share')}
          </button>
        </Show>
      </div>
    </div>
  );
}

interface FormProps {
  rate: Accessor<number>;
  asOf: string;
  amountRaw: Accessor<string>;
  currency: Accessor<Currency>;
  draftLaw: Accessor<boolean>;
  onAmount: (v: string) => void;
  onCurrency: (c: Currency) => void;
  onDraftToggle: (v: boolean) => void;
  meta: Record<Currency, CurrencyMeta>;
  t: NullableTranslator<Dictionary>
}
// CalculatorForm
function CalculatorForm(props: FormProps) {
  const {
    rate,
    asOf,
    amountRaw,
    currency,
    draftLaw,
    onAmount,
    onCurrency,
    onDraftToggle,
    meta,
    t
  } = props;
  const currencyList = Object.entries(meta) as [
    Currency,
    CurrencyMeta
  ][];
  let amountRef!: HTMLInputElement;
  onMount(() => {
    if (!amountRaw()) {
      amountRef.focus();
    }
  });
  return (
    <div class="md:space-y-6 overflow-hidden">
      <div class="bg-white rounded-3xl p-4 md:p-8 shadow-xl shadow-brand-100/50 border border-brand-100/50">
        <h2 class="max-sm:hidden md:text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
          <div class="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center">
            <svg
              class="w-5 h-5 text-brand-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          </div>
          {t('calc_title')}
        </h2>

        <div class="md:space-y-6 max-md:grid grid-cols-2 gap-2">
          {/* Amount Input */}
          <div class="group">
            <label
              for="amount"
              class="block text-sm font-semibold text-gray-700 mb-2"
            >
              {t('price_label')}
            </label>
            <div class="relative">
              <input
                ref={amountRef!}
                id="amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                class="w-full h-14 rounded-2xl border-2 border-gray-200 px-4 text-lg font-medium 
                               focus:border-brand-500 focus:ring-4 focus:ring-brand-100 transition-all duration-200
                               hover:border-gray-300 bg-gray-50/50 focus:bg-white"
                value={amountRaw()}
                onInput={(e) => onAmount(e.currentTarget.value.slice(0, 12))}
              />
              <div class="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                <span class="text-gray-400 font-medium">
                  {meta[currency()].narrow}
                </span>
              </div>
            </div>
          </div>

          {/* Currency Select */}
          <div class="group">
            <div class="flex justify-between align-baseline text-sm font-semibold text-gray-700 mb-2">
              <label
                for="currency"
                class="block"
              >
                {t('currency')}
              </label>

               <Show when={currency() !== "UAH"}>
                <span title={`1 ${currency()} = ${rate()} UAH (${t('NBU rate')} ${t('asOf')} ${asOf} )`}> {rate()}</span>
              </Show>

            </div>
            <select
              id="currency"
              class="w-full h-14 rounded-2xl border-2 border-gray-200 px-4 text-lg font-medium
                             focus:border-brand-500 focus:ring-4 focus:ring-brand-100 transition-all duration-200
                             hover:border-gray-300 bg-gray-50/50 focus:bg-white cursor-pointer"
              value={currency()}
              onChange={(e) => onCurrency(e.currentTarget.value as Currency)}
            >
              <For each={currencyList}>
                {([curCode, meta]) => (
                  <option 
                    value={curCode}
                    selected={curCode === currency()}
                    >
                    {meta.label}
                  </option>
                )}
              </For>
            </select>
          </div>

          {/* Draft Law Toggle */}
          <div class="bg-amber-50 rounded-2xl p-2 md:p-4 border border-amber-200 col-span-2">
            <div class="flex items-start gap-4">
              <div class="flex items-center h-6">
                <input
                  id="draftLaw"
                  type="checkbox"
                  checked={draftLaw()}
                  onChange={(e) => onDraftToggle(e.currentTarget.checked)}
                  class="w-5 h-5 text-amber-600 border-2 border-amber-300 rounded-md 
                                 focus:ring-amber-500 focus:ring-2 transition-colors"
                />
              </div>
              <div class="flex-1">
                <label
                  for="draftLaw"
                  class="text-sm font-semibold text-amber-800 cursor-pointer"
                >
                  {t('draft_label')}
                </label>
                <p class="text-xs text-amber-700 mt-1">
                  {t('draft_explanation')} ({t('draft_label_status')})
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
