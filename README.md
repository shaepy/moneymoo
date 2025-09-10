# moneymoo
#### Deployment Link: https://moneymoo-dac0bfd4070e.herokuapp.com/
| Test Credentials |
|------------------|
| Username: testuser |
| Password: password |
<img width="600" alt="Screenshot 2025-07-15 at 8 11 03 PM" src="https://github.com/user-attachments/assets/30f7f404-07e5-4949-9ad3-5c5bd78ffea7" />

## Overview
Moneymoo is a full-stack web application designed to help investors and traders:

- Manage and organize investment portfolios
- Log trade history and track unrealized gains/losses
- Search real-time stock prices and company financial data
- Add stocks to a personalized watchlist for quick access
  
Built with the MEN stack (MongoDB, Express, Node.js) and integrated with stock market APIs for real-time market data, **moneymoo** delivers accurate, up-to-date financial insights in an intuitive interface with session-based authentication.

<img width="600" alt="signed in homepage" src="https://github.com/user-attachments/assets/9f05fc97-04b7-4b05-ad5d-5b79036b994a" />
<img width="600" alt="portfolio page" src="https://github.com/user-attachments/assets/7e7301ec-4d01-4302-bcc3-ed72c5f8f6f4" />
<img width="600" alt="browse market page" src="https://github.com/user-attachments/assets/b3a9fe6e-40e5-4479-8866-4700b54591ea" />
<img width="600" alt="stock page" src="https://github.com/user-attachments/assets/1051175d-9000-4514-a9ec-3225dad78ad6" />

---

## Technology Stack
- **Back-end**: Node.js, MongoDB (with Mongoose), Express.js
- **Front-end**: HTML5, CSS, Bulma, JavaScript, EJS
- **Tools**: Notion, Figma, Postman, Compass

#### APIs
- [Alpaca Markets](https://docs.alpaca.markets/reference/stockbars)
- [Financial Modeling Prep](https://site.financialmodelingprep.com/developer/docs/stable)
- [Finnhub](https://finnhub.io/docs/api)

---

## Features

- **Portfolio Management** • Add, edit, and remove stock positions to build and manage multiple investment portfolios.
- **Trade Logging & History** • Record trades with purchase price, quantity, and dates to track unrealized gains/losses over time.
- **Real-Time Market Data** • Search for tickers and access up-to-date stock prices and key company financials through integrated APIs.
- **Watchlist** • Create and monitor a personalized watchlist of stocks for quick reference.
- **Trending Stocks** • Browse a curated list of popular and trending tickers to explore new opportunities.
- **User-Friendly Insights** • View portfolio performance at a glance, with clear calculations for cost basis and profit/loss.

---

## Planning Phase
My project management was done through Notion, utilizing a Kanban board for development. MVP stories were turned into tasks on the board, with any bugs or additional tickets being added to the backlog during the development phase.
- [Link to Full Project Plan ](https://www.notion.so/Unit-2-moneymoo-CRUD-app-21a7ed1fdd5880278eb5dc9129f1ff62?source=copy_link)
- [Kanban Board](https://www.notion.so/21b7ed1fdd5880899ec9ec812a6dedce?v=21b7ed1fdd58814f943b000cfff17172&source=copy_link)

---

### Entity Relationship Diagram (ERD)
After writing my MVP user stories, I focused on the data structure and determining the database relationships for my app. We were instructed to incorporate both reference and embedded subdocument relationships, which influenced how I structured the models. The User model includes arrays for portfolios and watchlists, holding references to portfolioIds and watchlistIds. 

I chose to create separate models for Stock and Trade: Stock is referenced in multiple places (like portfolios and watchlists), ensuring a single source of truth. Whereas Trade is a model to handle the large volume of trades each user may have, referencing both portfolioId and userId for easy querying. Portfolios and watchlists are also models, as a user can have many of each, with portfolios containing trade references and embedded userStocks, which reference individual stocks but also store portfolio-specific data.

<img src="https://github.com/user-attachments/assets/87d10641-a80a-4052-918c-af9c77573639" alt="entity relationship diagram" width="740"/>

### Researched APIs 
During the planning phase, I researched several external APIs to integrate into the app by evaluating their pricing options and call limits. I preferred free services but decided to pay for a single month's subscription to Financial Modeling Prep to test with higher API limits. I used [Alpaca Markets](https://docs.alpaca.markets/reference/stockbars) for real-time stock data and bar charts, [Finnhub](https://finnhub.io/docs/api) for financial metrics such as P/E ratios and earnings per share, and [Financial Modeling Prep](https://site.financialmodelingprep.com/developer/docs/stable) for detailed stock information and company profiles.

Utilizing Postman, I tested responses from the APIs to view the JSON data. This helped solidify my ERD before beginning development as I knew what data values to expect.

---

## Challenges
1. One of the main challenges I faced was managing the dependencies of multiple models with references to each other. For example, since the Portfolio model is tied to Trades, UserStocks, and Users, deleting a portfolio required ensuring that corresponding trades were also deleted and that the portfolio reference was removed from the user's portfolio list. This complexity extended to watchlists as well, requiring careful consideration of all database areas that needed to be updated or deleted, making CRUD operations more intricate and time-consuming. Each update or delete operation involved thinking through how different models were linked and ensuring consistency across the database.
2. Another challenge was time. A week was enough to complete an MVP and get things working, but it didn't leave much room for covering all the edge cases I encountered as I went along. This also meant that achieving my stretch goals would require significantly more time. In the previous unit, I worked on a front-end only browser game, which I was able to complete much quicker. Being new to backend development, this project highlighted the amount of time required for both front-end and back-end work, with a much larger portion dedicated to the backend and server setup.

## Wins
1. Having a well-structured data diagram and clear MVP requirements allowed me to move through tasks efficiently, with a solid sense of direction. I always knew how to proceed and never felt stuck during the project.
2. Another win was getting familiar with the MVC architecture and learning how to modularize dependencies. I became very comfortable with the backend components and truly enjoyed working on that part of the project, which fortunately made up a bulk of the work.

## Key Learnings
### Cron Job
A favorite key learning was writing a cron job using node-cron. I gained an understanding of what a cron job is and how it can be utilized to automate tasks at specific intervals. Specifically, I used a cron job to fetch stock prices periodically and update the stock prices in my database’s stock model, ensuring the data stayed up-to-date without manual intervention. This helped streamline the process of keeping stock information current in the app.

### Unit Testing
Another key learning was considering unit testing during development. Although I didn’t use official tools like Mocha or Jest, I employed a simple method of writing `console.logs` as I developed each section of code to check the data being returned. By logging both the expected response and the variable that should store the fetched data, I could easily compare the two and ensure they matched. This approach helped streamline my development process, allowing me to keep things modular and tackle potential issues quickly without needing to debug large blocks of code.

## Bugs
There are known bugs that need to be fixed and implemented.

#### Known Issues 
- After adding a stock to a watchlist, `/watchlist` does not show the stock until manual refresh
- Day change and change percentage are not being updated/recalculated after adding to Stock model

## Future Improvements 
- Manual refresh stock prices button
- Add charts to stock pages and portfolios
- Show profit/loss history for trades and stocks
- Search for a stock by company name

### Stretch Goals
These were stretch goals set during the MVP phase. As a user,
- I want to see my realized profit/loss history based on my trades, for each stock I own(ed).
- I want to see daily chart history for portfolio account values so I may know how my portfolios are performing.
- I want to see an allocation visual for stocks in my portfolio(s), divided by their industries or sectors.
