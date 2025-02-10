import { Bot, InlineKeyboard } from "grammy";
import { ENV } from "./config/env";
import { Menu } from "@grammyjs/menu";
import express from "express";

import cors from "cors";
import bodyParser from "body-parser";

import { TARIFF_TYPE, QUESTIONS_TYPE } from "./store/tariff/constants";
import { tariffStore } from "./store";
import {
  FAQ_REGEX,
  MESSAGE_TEXT_SELECT_TARIFF,
  PROFILE_REGEX,
  RATE_REGEX,
  SUPPORT_REGEX,
  TEXT_FAQ_MESSAGE,
  WELCOME_MESSAGE,
} from "./constants";
import { CONFIG_TEXT_TARIFF, TEXT_QUESTIONS } from "./store/tariff/configText";

const BOT_TOKEN = ENV.BOT_TOKEN;

const bot = new Bot(BOT_TOKEN);
const app = express();
// Разблокировать cors
app.use(cors());
app.use(express.json());
// позволяет принимать входящее тело запроса POST
app.use(bodyParser.json());

const port = process.env.PORT || 3000;

app.listen(port, async () => {
  try {
    const menuTariff = new Menu("menu-tarif")
      .submenu("💵 1 месяц — 299₽", "menu-payment", (ctx) =>
        handleTariff(ctx, TARIFF_TYPE.ONE_MONTH)
      )
      .row()
      .submenu("📅 3 месяца — 799₽ (экономия 12%)", "menu-payment", (ctx) =>
        handleTariff(ctx, TARIFF_TYPE.THREE_MONTH)
      )
      .row()
      .submenu(
        "🏆 12 месяцев — 2999₽ (выгода 20% + 2 недели в подарок!)",
        "menu-payment",
        (ctx) => handleTariff(ctx, TARIFF_TYPE.ONE_YEAR)
      );
    const menuPayment = new Menu("menu-payment")
      .text("🇷🇺 КАРТА РФ", (ctx) => handlePayment(ctx))
      .row()
      .text("💰 ЮКасса", (ctx) => handlePayment(ctx))
      .row()
      .text("💳 СБП", (ctx) => handlePayment(ctx))
      .row()
      .submenu("◀️ Назад", "menu-tarif", (ctx) => handleBackTariffPlan(ctx));

    const menuQuestions = new Menu("menu-questions")
      .submenu(
        "❓ Зачем нужен сканер коэффициентов?",
        "menu-answer-questions",
        (ctx) => handleQuestions(ctx, QUESTIONS_TYPE.SCANNER)
      )
      .row()
      .submenu("❓ Что такое прогруз?", "menu-answer-questions", (ctx) =>
        handleQuestions(ctx, QUESTIONS_TYPE.LOAD)
      )
      .row()
      .submenu(
        "❓ Другие причины изменения коэффициентов",
        "menu-answer-questions",
        (ctx) => handleQuestions(ctx, QUESTIONS_TYPE.OTHER_COEFF)
      );

    const menuAnswerQuestions = new Menu("menu-answer-questions")
      .submenu("Оформить подписку", "menu-tarif", (ctx) =>
        handleBackTariffPlan(ctx)
      )
      .row()
      .submenu("◀️ Назад", "menu-questions", (ctx) => handleBackQuestions(ctx));

    menuQuestions.register(menuAnswerQuestions);
    menuTariff.register([menuPayment, menuAnswerQuestions]);
    bot.use(menuTariff);
    bot.use(menuQuestions);

    // Бургер меню
    bot.api.setMyCommands([
      {
        command: "start",
        description: "Старт бота",
      },
      {
        command: "tariff",
        description: "🔥 Тарифы",
      },
      {
        command: "profile",
        description: "📲 Личный кабинет",
      },
      {
        command: "faq",
        description: "❔FAQ",
      },
      {
        command: "support",
        description: "💬 Тех.поддержка",
      },
    ]);

    bot.command("start", async (ctx) => {
      // // Кнопки после сообщения под textarea
      const keyboard = [
        [{ text: "🔥 Тарифы" }],
        [{ text: "📲 Личный кабинет" }],
        [{ text: "❔FAQ" }],
        [{ text: "💬 Тех.поддержка" }],
      ];

      await ctx.reply(WELCOME_MESSAGE, {
        parse_mode: "Markdown",
        reply_markup: {
          keyboard,
          resize_keyboard: true,
          one_time_keyboard: false,
        },
      });
    });

    // Обработчик нажатий на кнопки
    bot.hears(/tariff|profile|faq|support/, async (ctx) => {
      switch (ctx.match[0]) {
        case "tariff": {
          const messageText = "Выберите один из видов тарифов:";

          await ctx.reply(messageText, { reply_markup: menuTariff });

          break;
        }

        case "profile": {
          await handleProfile(ctx);
          break;
        }

        case "faq": {
          await ctx.reply(TEXT_FAQ_MESSAGE, {
            reply_markup: menuQuestions,
          });

          break;
        }

        case "support": {
          await handleSupport(ctx);
          break;
        }
      }
    });

    // Обработайте другие сообщения.
    bot.on("message", handleMainMessage);
    bot.start();

    async function handleTariff(ctx, typeTariff = TARIFF_TYPE.ONE_MONTH) {
      tariffStore.tariff = typeTariff;
      const messageText = CONFIG_TEXT_TARIFF[typeTariff];
      await ctx.editMessageText(messageText);
    }

    async function handleBackTariffPlan(ctx) {
      await ctx.editMessageText(MESSAGE_TEXT_SELECT_TARIFF);
    }

    async function handleBackQuestions(ctx) {
      await ctx.editMessageText(TEXT_FAQ_MESSAGE);
    }

    async function handleProfile(ctx) {
      await ctx.reply("Profile");
    }

    async function handleQuestions(ctx, typeAnswer = QUESTIONS_TYPE.SCANNER) {
      const messageText = TEXT_QUESTIONS[typeAnswer];
      await ctx.editMessageText(messageText);
    }

    async function handleSupport(ctx) {
      await ctx.reply("Support", { reply_markup: menuTime });
    }

    async function handlePayment(ctx) {
      await ctx.reply("Payment");
    }

    async function handleMainMessage(ctx) {
      const messageUser = ctx?.message?.text;

      if (RATE_REGEX.test(messageUser)) {
        // Отправить сообщение с выбором тарифа и кнопками
        await ctx.reply(MESSAGE_TEXT_SELECT_TARIFF, {
          reply_markup: menuTariff,
        });

        return;
      }

      if (FAQ_REGEX.test(messageUser)) {
        await ctx.reply("Часто задаваемые вопросы:", {
          reply_markup: menuQuestions,
        });

        return;
      }

      if (PROFILE_REGEX.test(messageUser)) {
        const messageText = "PROFILE";
        await ctx.reply(messageText);

        return;
      }

      if (SUPPORT_REGEX.test(messageUser)) {
        const messageText = "SUPPORT";
        await ctx.reply(messageText);

        return;
      }

      await ctx.reply(
        "Не знаю такой команды. Воспользуйтесь списком команд внизу под текстом или меню слева"
      );
    }
    // const resJson = await fetch(
    //   "https://parser-api.com/parser/gibdd_api/?key=186ef6af388f5c660fe2c97007f8960f&vin=WP0ZZZ98ZRS272224&types=history,dtp,wanted,restrict",
    //   // "https://fit-hub-team.ru/api/proteins",
    //   {
    //     method: "GET",
    //     headers: {
    //       "Content-Type": "application/json",
    //     },
    //   }
    // );
    // const result = await resJson.json();
    // console.log(result);

    console.log(`Server listening on port ${port}`);
  } catch (error) {
    console.log("Error app", error);
  }
});
