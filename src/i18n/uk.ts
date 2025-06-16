export const dict = {
  title: "Калькулятор мита та ПДВ",
  calc_title: "Розрахунок мита",
  price_label: "Вартість товару",
  currency: "Валюта",
  draft_label: "Законопроєкт 2025 року",
  draft_explanation: "ПДВ з першого євро",
  draft_label_status: "ще не діє",
  free: "Безкоштовно",
  has_pay: "Є платежі",
  import_duty: "Ввізне мито",
  vat: "ПДВ (20%)",
  total: "Загальна сума до доплати",
  enter_value: "Введіть суму для розрахунку",
  share: "Поділитись результатом",
  copied: "Посилання скопійовано до буферу обміну",
  result: "Результат",
  no_duty_message:
    "Ваше замовлення не перевищує ліміт в 150€, тому додаткові платежі не нараховуються.",
  howItWorks: {
    title: "Як це працює?",
    limit: "Ліміт 150€",
    limitExplanation: "Без мита та ПДВ",
    overlimit: "Понад 150€",
    overlimitExplanation: "Мито 10% + ПДВ 20%",
    draft_law: "Законопроєкт",
    draft_law_explanation: "ПДВ з першого євро",
  },
  footer: {
    'a project by': "проєкт від",
    'Report a bug': "Повідомити про помилку",
    'Other questions': "Інші питання",
  }
};

export type Dict = typeof dict;
