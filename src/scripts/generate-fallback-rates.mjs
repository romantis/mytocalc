import fs from 'fs/promises';
// import fetch from 'node-fetch';

// URL НБУ для отримання курсів
const API_URL = 'https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json';

async function main() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) {
      throw new Error(`Не вдалося отримати курси. HTTP статус: ${res.status}`);
    }
    const data = await res.json();
    // Перетворюємо масив у Record<string, number>
    const rates = Object.fromEntries(data.map(({ cc, rate }) => [cc, rate]));
    await fs.writeFile(
      "./src/data/rates.fallback.json",
      JSON.stringify(rates),
      "utf-8"
    );
    console.log('✅ Експортовано оновлений файл src/data/rates.fallback.json');
  } catch (err) {
    console.error('❌ Помилка при отриманні/записі rates.fallback.json:', err);
    process.exit(1);
  }
}

main();