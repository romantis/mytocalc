import { createSignal, createMemo, onMount } from "solid-js";
import { calcDuty } from "../../lib/calc";
import type { DutyResult } from "../../lib/calc";

/**
 * Props expected by the DutyCalculator.
 * `rates` — map з курсовими значеннями НБУ, де ключі «EUR», «USD», «UAH»,
 * значення — скільки ₴ за 1 од. валюти.
 */
interface DutyCalculatorProps {
  rates: Record<string, number>;
  /** Optional initial state pulled from URL‑params on SSR */
  initialAmount?: number;
  initialCurrency?: "EUR" | "USD" | "UAH";
  initialDraftLaw?: boolean;
}

const EUR = "EUR" as const;
const USD = "USD" as const;
const UAH = "UAH" as const;

export default function DutyCalculator(props: DutyCalculatorProps) {
  /* ---------------------------- state ---------------------------- */
  const [amount, setAmount] = createSignal<string>(
    props.initialAmount?.toString() ?? ""
  );
  const [currency, setCurrency] = createSignal<"EUR" | "USD" | "UAH">(
    props.initialCurrency ?? EUR
  );
  const [draftLaw, setDraftLaw] = createSignal<boolean>(
    props.initialDraftLaw ?? false
  );

  /* ------------- derive «вартість у EUR» для розрахунку ------------- */
  const amountEur = createMemo<number>(() => {
    const val = parseFloat(amount());
    if (isNaN(val) || val <= 0) return 0;

    if (currency() === EUR) return val;

    const rateToUah = props.rates[currency()];
    const eurRate = props.rates[EUR];
    if (!rateToUah || !eurRate) return 0;

    return (val * rateToUah) / eurRate; // USD/UAH → EUR
  });

  /* ------------------------ митні платежі ------------------------ */
  const duty = createMemo<DutyResult>(() =>
    calcDuty(amountEur(), draftLaw())
  );

  /* --------------------- форматування сум --------------------- */
  const fmt = new Intl.NumberFormat("uk-UA", {
    style: "currency",
    currency: EUR,
    minimumFractionDigits: 2,
  });
  const formatted = createMemo(() => ({
    duty: fmt.format(duty().duty),
    vat: fmt.format(duty().vat),
    total: fmt.format(duty().total),
  }));

  /* -------------------- URL ↔ state синхронізація -------------------- */
  const syncUrl = () => {
    const q = new URLSearchParams();
    if (amount()) q.set("amount", amount());
    if (currency()) q.set("currency", currency());
    if (draftLaw()) q.set("draft", "1");
    window.history.replaceState({}, "", `?${q.toString()}`);
  };

  // При монтуванні зчитуємо початкові параметри з URL
  onMount(() => {
    const q = new URLSearchParams(window.location.search);
    const a = q.get("amount");
    const c = q.get("currency") as "EUR" | "USD" | "UAH" | null;
    const d = q.get("draft");
    if (a) setAmount(a);
    if (c && [EUR, USD, UAH].includes(c)) setCurrency(c);
    if (d === "1") setDraftLaw(true);
  });

  // Ефект: коли будь‑який із input‑state змінюється → оновлюємо URL
  createMemo(() => {
    amount();
    currency();
    draftLaw();
    syncUrl();
    return null;
  });

  /* ------------------------ share / copy link ------------------------ */
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ url });
      } else {
        await navigator.clipboard.writeText(url);
        alert("Посилання скопійовано у буфер обміну");
      }
    } catch {
      /* ignore */
    }
  };

  /* --------------------------- UI --------------------------- */
  return (
    <div class="w-full max-w-md mx-auto flex flex-col gap-4">
      {/* amount */}
      <div>
        <label for="amount" class="block text-sm font-medium mb-1">
          Сума товару
        </label>
        <input
          id="amount"
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          class="w-full rounded-2xl border px-3 py-2 shadow-inner focus:outline-none focus:ring-2"
          value={amount()}
          onInput={(e) => setAmount(e.currentTarget.value)}
        />
      </div>

      {/* currency */}
      <div>
        <label for="currency" class="block text-sm font-medium mb-1">
          Валюта
        </label>
        <select
          id="currency"
          class="w-full rounded-2xl border px-3 py-2 shadow-inner"
          value={currency()}
          onChange={(e) => setCurrency(e.currentTarget.value as any)}
        >
          <option value={EUR}>€ (EUR)</option>
          <option value={USD}>$ (USD)</option>
          <option value={UAH}>₴ (UAH)</option>
        </select>
      </div>

      {/* draft law toggle */}
      <div class="flex items-center gap-3 select-none">
        <input
          id="draftLaw"
          type="checkbox"
          checked={draftLaw()}
          onChange={(e) => setDraftLaw(e.currentTarget.checked)}
        />
        <label for="draftLaw">Правила законопроєкту 2025</label>
      </div>

      {/* result */}
      <div class="bg-slate-50 rounded-2xl p-4 shadow-inner">
        <h2 class="text-lg font-semibold mb-2">Результат</h2>
        <div class="flex justify-between">
          <span>Мито</span>
          <span>{formatted().duty}</span>
        </div>
        <div class="flex justify-between">
          <span>ПДВ</span>
          <span>{formatted().vat}</span>
        </div>
        <hr class="my-2" />
        <div class="flex justify-between font-bold">
          <span>Разом</span>
          <span>{formatted().total}</span>
        </div>
      </div>

      <button
        class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-2xl py-2 shadow transition-colors"
        onClick={share}
      >
        Поділитись
      </button>
    </div>
  );
}
