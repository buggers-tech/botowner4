const axios = require('axios');

// Full ISO 3166-1 alpha-2 country codes mapping
const countryCodes = {
    afghanistan: 'af',
    albania: 'al',
    algeria: 'dz',
    angola: 'ao',
    argentina: 'ar',
    armenia: 'am',
    australia: 'au',
    austria: 'at',
    azerbaijan: 'az',
    bangladesh: 'bd',
    belgium: 'be',
    brazil: 'br',
    bulgaria: 'bg',
    canada: 'ca',
    chile: 'cl',
    china: 'cn',
    colombia: 'co',
    croatia: 'hr',
    cyprus: 'cy',
    czechrepublic: 'cz',
    denmark: 'dk',
    egypt: 'eg',
    estonia: 'ee',
    ethiopia: 'et',
    finland: 'fi',
    france: 'fr',
    germany: 'de',
    ghana: 'gh',
    greece: 'gr',
    hungary: 'hu',
    iceland: 'is',
    india: 'in',
    indonesia: 'id',
    ireland: 'ie',
    israel: 'il',
    italy: 'it',
    japan: 'jp',
    kenya: 'ke',
    lebanon: 'lb',
    lithuania: 'lt',
    luxembourg: 'lu',
    malaysia: 'my',
    mexico: 'mx',
    morocco: 'ma',
    netherlands: 'nl',
    nigeria: 'ng',
    norway: 'no',
    pakistan: 'pk',
    peru: 'pe',
    philippines: 'ph',
    poland: 'pl',
    portugal: 'pt',
    romania: 'ro',
    russia: 'ru',
    saudiarabia: 'sa',
    senegal: 'sn',
    singapore: 'sg',
    southafrica: 'za',
    southkorea: 'kr',
    spain: 'es',
    sweden: 'se',
    switzerland: 'ch',
    syria: 'sy',
    taiwan: 'tw',
    tanzania: 'tz',
    thailand: 'th',
    tunisia: 'tn',
    turkey: 'tr',
    uganda: 'ug',
    uk: 'gb',
    unitedkingdom: 'gb',
    unitedstates: 'us',
    us: 'us',
    vietnam: 'vn',
    zambia: 'zm',
    zimbabwe: 'zw',
    somalia: 'so'
    // You can add more as needed
};

module.exports = async function (sock, chatId, message) {
    try {
        const rawText = message.message?.conversation || message.message?.extendedTextMessage?.text || "";
        const parts = rawText.trim().split(/\s+/);
        let query = parts.slice(1).join(' ') || 'us';

        const apiKey = 'dcd720a6f1914e2d9dba9790c188c08c'; // Your NewsAPI key
        let apiUrl;

        // Determine if query is a country name or code
        const lowerQuery = query.toLowerCase().replace(/\s+/g, '');
        let countryCode = null;

        if (lowerQuery.length === 2) {
            countryCode = lowerQuery; // assume 2-letter code
        } else if (countryCodes[lowerQuery]) {
            countryCode = countryCodes[lowerQuery];
        }

        if (countryCode) {
            apiUrl = `https://newsapi.org/v2/top-headlines?country=${countryCode}&apiKey=${apiKey}`;
        } else {
            apiUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&apiKey=${apiKey}`;
        }

        const response = await axios.get(apiUrl, { timeout: 15000 });
        const articles = response.data.articles.slice(0, 5);

        if (!articles.length) {
            await sock.sendMessage(chatId, { text: `⚠ No news found for "${query}".` });
            return;
        }

        let newsMessage = `📰 *Latest News for "${query}"*:\n\n`;
        articles.forEach((article, index) => {
            newsMessage += `${index + 1}. *${article.title}*\n${article.description || 'No description'}\n${article.url}\n\n`;
        });

        await sock.sendMessage(chatId, { text: newsMessage });

    } catch (error) {
        console.error('Error fetching news:', error);
        await sock.sendMessage(chatId, { text: '⚠ Sorry, I could not fetch news right now.' });
    }
};
