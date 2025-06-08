import { createSignal, createMemo, createEffect, onMount } from "solid-js";

import { calcDuty } from "../../lib/calc";
import type { DutyResult } from "../../lib/calc";

type Currency = 'EUR' | 'USD' |  'UAH';

interface DutyCalculatorProps {
  rates: Record<string, number>;
  /** Optional initial state pulled from URL‑params on SSR */
  initialAmount?: number;
  initialCurrency?: Currency;
  initialDraftLaw?: boolean;
}

const EUR = "EUR" as const;
const USD = "USD" as const;
const UAH = "UAH" as const;

// Helper functions
function convertFromEur(valueEur: number, to: Currency, rates: Record<string, number>) {
  if (to === "EUR") return valueEur;
  const eurToUah = rates["EUR"];          // 1 EUR → грн
  if (!eurToUah) return NaN;

  const valueUah = valueEur * eurToUah;   // спершу все у ₴

  if (to === "UAH") return valueUah;
  const targetRate = rates[to];           // 1 USD → грн, тощо
  return targetRate ? valueUah / targetRate : NaN;
}


export default function DutyCalculator(props: DutyCalculatorProps) {
  /* ---------------------------- state ---------------------------- */
  
  const [amount, setAmount] = createSignal<string>(
    props.initialAmount?.toString() ?? ""
  );
  const [currency, setCurrency] = createSignal<Currency>(
    props.initialCurrency ?? EUR
  );
  const [draftLaw, setDraftLaw] = createSignal<boolean>(
    props.initialDraftLaw ?? false
  );

  const [displayCur, setDisplayCur] = createSignal<Currency>("UAH"); // default ₴

  const [isAnimating, setIsAnimating] = createSignal(false);

  const amountEur = createMemo(() => {
    const val = parseFloat(amount());
    if (isNaN(val) || val <= 0) return 0;
    
    if (currency() === "EUR") return val;
    if (currency() === "UAH") return val / props.rates["EUR"]; // UAH → EUR
    
    const rateToUah = props.rates[currency()];
    const eurRate = props.rates["EUR"];
    if (!rateToUah || !eurRate) return 0;
    
    return (val * rateToUah) / eurRate;
  });

  
  const duty = createMemo<DutyResult>(() => calcDuty(amountEur(), draftLaw()));
 
  const convertedTotal = createMemo(() => {
    const res = duty(); // duty().total у € (як і раніше)
    return convertFromEur(res.total, displayCur(), props.rates);
  });


  const moneyFmt = createMemo(
    () =>
      new Intl.NumberFormat("uk-UA", {
        style: "currency",
        currency: displayCur(),
        minimumFractionDigits: 2,
      })
  );

  const formatted = createMemo(() => ({
    duty: moneyFmt().format(duty().duty),
    vat: moneyFmt().format(duty().vat),
    total: moneyFmt().format(duty().total),
  }));

  // Sync URL
  const syncUrl = () => {
    const q = new URLSearchParams();
    if (amount()) q.set("amount", amount());
    if (currency()) q.set("currency", currency());
    if (draftLaw()) q.set("draft", "1");
    if (displayCur() !== "UAH") q.set("out", displayCur());
    window.history.replaceState({}, "", `?${q.toString()}`);
  };

  onMount(() => {
    const q = new URLSearchParams(window.location.search);
    const a = q.get("amount");
    const c = q.get("currency") || EUR; // Default to EUR if not specified
    const d = q.get("draft");
    if (a) setAmount(a);
    if (c && ["EUR", "USD", "UAH"].includes(c)) setCurrency(c as Currency);
    if (d === "1") setDraftLaw(true);
  });

  // Animation trigger
  createEffect(() => {
    if (amount() && parseFloat(amount()) > 0) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 300);
    }
  });

  // URL sync effect
  createEffect(() => {
    amount();
    currency();
    draftLaw();
    syncUrl();
  });

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert("Посилання скопійовано у буфер обміну");
      }
    } catch {
      // ignore
    }
  };

  const hasResult = () => amountEur() > 0;
  const isFree = () => hasResult() && duty().total === 0;

  const getCurrencySymbol = () => {
    switch (currency()) {
      case "EUR": return "€";
      case "USD": return "$";
      case "UAH": return "₴";
      default: return "";
    }
  };

  return (
     

        <div class="grid lg:grid-cols-2 gap-8">
          {/* Calculator Form */}
          <div class="space-y-6">
            <div class="bg-white rounded-3xl p-8 shadow-xl shadow-blue-100/50 border border-blue-100/50">
              <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
                Розрахунок мита
              </h2>

              <div class="space-y-6">
                {/* Amount Input */}
                <div class="group">
                  <label for="amount" class="block text-sm font-semibold text-gray-700 mb-2">
                    Вартість товару
                  </label>
                  <div class="relative">
                    <input
                      id="amount"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      class="w-full h-14 rounded-2xl border-2 border-gray-200 px-4 text-lg font-medium 
                               focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200
                               hover:border-gray-300 bg-gray-50/50 focus:bg-white"
                      value={amount()}
                      onInput={(e) => setAmount(e.currentTarget.value.slice(0, 12))}
                    />
                    <div class="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                      <span class="text-gray-400 font-medium">{getCurrencySymbol()}</span>
                    </div>
                  </div>
                </div>

                {/* Currency Select */}
                <div class="group">
                  <label for="currency" class="block text-sm font-semibold text-gray-700 mb-2">
                    Валюта
                  </label>
                  <select
                    id="currency"
                    class="w-full h-14 rounded-2xl border-2 border-gray-200 px-4 text-lg font-medium
                             focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200
                             hover:border-gray-300 bg-gray-50/50 focus:bg-white cursor-pointer"
                    value={currency()}
                    onChange={(e) => setCurrency(e.currentTarget.value as "EUR" | "USD" | "UAH")}
                  >
                    <option value="EUR">€ Euro (EUR)</option>
                    <option value="USD">$ Dollar (USD)</option>
                    <option value="UAH">₴ Гривня (UAH)</option>
                  </select>
                </div>

                {/* Draft Law Toggle */}
                <div class="bg-amber-50 rounded-2xl p-4 border border-amber-200">
                  <div class="flex items-start gap-4">
                    <div class="flex items-center h-6">
                      <input
                        id="draftLaw"
                        type="checkbox"
                        checked={draftLaw()}
                        onChange={(e) => setDraftLaw(e.currentTarget.checked)}
                        class="w-5 h-5 text-amber-600 border-2 border-amber-300 rounded-md 
                                 focus:ring-amber-500 focus:ring-2 transition-colors"
                      />
                    </div>
                    <div class="flex-1">
                      <label for="draftLaw" class="text-sm font-semibold text-amber-800 cursor-pointer">
                        Законопроєкт 2025 року
                      </label>
                      <p class="text-xs text-amber-700 mt-1">
                        ПДВ з першого євро (ще не діє)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          <div class="space-y-6">
            {/* Main Result Card */}
            <div class={`bg-white rounded-3xl p-8 shadow-xl border transition-all duration-500 ${
              hasResult() 
                ? isFree() 
                  ? 'shadow-green-100/50 border-green-200/50 bg-gradient-to-br from-white to-green-50/30' 
                  : 'shadow-red-100/50 border-red-200/50 bg-gradient-to-br from-white to-red-50/30'
                : 'shadow-gray-100/50 border-gray-200/50'
            } ${isAnimating() ? 'scale-[1.02]' : 'scale-100'}`}>
              
              <div class="flex items-center justify-between mb-6">
                <h3 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <div class={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    hasResult() 
                      ? isFree() ? 'bg-green-100' : 'bg-red-100'
                      : 'bg-gray-100'
                  }`}>
                    <svg class={`w-5 h-5 transition-colors ${
                      hasResult() 
                        ? isFree() ? 'text-green-600' : 'text-red-600'
                        : 'text-gray-400'
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  Результат
                </h3>
                
                {hasResult() && (
                  <div class={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    isFree() 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {isFree() ? 'Безкоштовно' : 'Є платежі'}
                  </div>
                )}
              </div>

              {!hasResult() ? (
                <div class="text-center py-12">
                  <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <p class="text-gray-500 font-medium">Введіть суму для розрахунку</p>
                </div>
              ) : (
                <div class="space-y-4">
                  {/* Breakdown */}
                  <div class="space-y-3">
                    <div class="flex justify-between items-center py-3 border-b border-gray-100">
                      <span class="text-gray-600 font-medium">Ввізне мито</span>
                      <span class="text-lg font-bold text-gray-900">{formatted().duty}</span>
                    </div>
                    <div class="flex justify-between items-center py-3 border-b border-gray-100">
                      <span class="text-gray-600 font-medium">ПДВ (20%)</span>
                      <span class="text-lg font-bold text-gray-900">{formatted().vat}</span>
                    </div>
                  </div>
                  
                  {/* Total */}
                  <div class={`rounded-2xl p-6 ${
                    isFree() 
                      ? 'bg-green-50 border-2 border-green-200' 
                      : 'bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200'
                  }`}>
                    <div class="flex justify-between items-center">
                      <span class={`text-lg font-bold ${
                        isFree() ? 'text-green-800' : 'text-red-800'
                      }`}>
                        Загальна сума <br/> до доплати
                      </span>
                      <span class={`text-3xl font-black ${
                        isFree() ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatted().total}
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  {isFree() && (
                    <div class="bg-blue-50 rounded-xl p-4 border border-blue-200">
                      <div class="flex gap-3">
                        <svg class="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p class="text-sm text-blue-800">
                          Ваше замовлення не перевищує ліміт в 150€, тому додаткові платежі не нараховуються.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Share Button */}
            {hasResult() && (
              <button
                onClick={share}
                class="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 
                         text-white font-bold py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl 
                         transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]
                         flex items-center justify-center gap-3"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
                Поділитись результатом
              </button>
            )}
          </div>
        </div>
  );
}