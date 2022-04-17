const axios = require("axios");
const cheerio = require("cheerio");
const { config, Group } = require("../");
const key = require("../config.json"); //api키
const moment = require("moment");
let maxPostNumber = 32;
require("moment-timezone");
moment.tz.setDefault("Asia/Seoul");
const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const coolsms = require("coolsms-node-sdk").default;
const messageService = new coolsms(key.apiKey, key.apiSecret);
console.log("Server started at " + moment().format("YYYY-MM-DD HH:mm:ss"));

config.init({
  apiKey: key.apiKey,
  apiSecret: key.apiSecret
});

const url = "https://soco.seoul.go.kr/youth/bbs/BMSR00015/list.do?menuNo=400008";

setInterval(async function() {
  let driver = await new Builder().forBrowser("chrome").build();  //가상 브라우저 빌드
  try {
    await driver.get(url);
    let boardTable = await driver.wait(until.elementLocated(By.className("boardTable")), 3000);
    let webElement = await boardTable.findElement(By.id("boardList"));
    let text = (await webElement.getText()).toString().trim();
    let textArray = text.split(/\r\n|\r|\n/);
    const result = [];
    for (let i = 0; i < textArray.length; i += 3) {
      const headers = textArray[i].split(" ");
      const id = headers[0];
      const isPublic = headers[1].includes("공공");
      const title = textArray[i + 1];
      const detail = textArray[i + 2].split(" ");
      const createdAt = detail[0];
      const startedAt = detail[1];
      result.push({ id: parseInt(id), isPublic, title, createdAt, startedAt });
    }
    if (result[0].id > maxPostNumber) {
      let text = `새로운 행복주택 ${result[0].isPublic ? "공공" : "민간"}공고가 올라왔습니다.\n${result[0].title}\n[게시날짜] ${result[0].createdAt}\n[접수시작] ${result[0].startedAt}`;
      let subject = "역세권 행복주택 새로운 공고 알림";
      await messageService.sendOne({
        to: key.phoneNumber,
        from: key.phoneNumber,
        text,
        subject
      });
      await messageService.sendOne({
        to: key.targetNumber,
        from: key.phoneNumber,
        text,
        subject
      });
    }

  } catch (e) {
    console.log(e);
  } finally {
    await driver.quit(); //가상 브라우저를 종료시킨다
  }
}, 300000);
