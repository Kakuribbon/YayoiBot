require('dotenv').config();
/* TYPEDEF */
const TYPE_TIMEOUT = 10;
const ASA_TIME = 6;
const YUUGATA_TIME = 17;
const YORU_TIME = 20;
const TIMESTATE_ASA = 1;
const TIMESTATE_YORU = 0;
const TIMESTATE_YUUGATA = 2;
const TIMESTATE_NUM = 3;		/* 1日のタイムテーブルの数 */

const Discord = require('discord.js');
const BotData = require('toml');
const { promisify } = require("util");
const fs = require("fs");
const readFileAsync = promisify(fs.readFile);
const client = new Discord.Client();

/* variable */
var hour, youbi;
var hour = 1000 * 60 * 60;
var timeState;		/* 0:夜、1:朝昼 */
var dayState;		/* 0：日曜～6：土曜 */
var respQuery = 0;	/* 0:返答要求なし、1～:返答要求あり */
var respStr;		/* 返答文字列 */
var respMess;		/* レスポンスメッセージオブジェクト */
var data;
var queryTblNum;	/* クエリで一致した配列番号 */
var earnUser;		/* 学習させようとしているユーザー */
var earnQuery;		/* 学習させようとしているクエリ */
var earnResp;		/* 学習させようとしているレスポンス */
var earnPhase = 0;	/* 学習フェーズ */
var earnFileStatQuery;	/* 学習ファイルサイズ(クエリ) */
var earnFileStatResp;	/* 学習ファイルサイズ(レスポンス) */
var channelObj		/* チャンネルオブジェクト */

// tomlファイルの読み込み
readFileAsync("yayoi.toml").then(obj => {
	data = BotData.parse(obj);
});

client.on('ready', () => {
	console.log('ログインしました');
	var time = new Date();
	console.log(time.getHours());
	if ((time.getHours() >= YORU_TIME) && (time.getHours() <= ASA_TIME))
	{
		timeState = TIMESTATE_ASA;
	}
	else
	{
		timeState = TIMESTATE_YORU;
	}
	console.log("timeState = " + timeState);
	dayState = time.getDay();
});

setInterval(function()
{
	var time = new Date();
	hour = time.getHours();
	dayState = time.getDay();

	if ( hour >= YORU_TIME )
	{
		if ( timeState != TIMESTATE_YORU )
		{
			timeState = TIMESTATE_YORU;
			client.user.setAvatar('yayoi_yoru.png');
			console.log("timeState = " + timeState);
		}
	}
	else if ( hour >= YUUGATA_TIME )
	{
		if ( timeState != TIMESTATE_YUUGATA )
		{
			timeState = TIMESTATE_YUUGATA;
			client.user.setAvatar('yayoi_ajimi.png');
			console.log("timeState = " + timeState);
		}
	}
	else if ( hour >= ASA_TIME )
	{
		if ( timeState != TIMESTATE_ASA )
		{
			timeState = TIMESTATE_ASA;
			client.user.setAvatar('yayoi_hiru.png');
			console.log("timeState = " + timeState);
		}
	}
},180000);

setInterval(function()
{	/* 3秒毎に呼び出し */
	if ( respQuery == 1 )
	{
		respMess.channel.send(respStr);
		respQuery = 0;
		respMess.channel.stopTyping();
	}
	else if ( respMess )
	{	/* respMessが定義されている場合 */
		if ( client.user.typingIn(respMess) )
		{	/* タイピング中なら止める */
			respMess.channel.stopTyping();
		}
	}
},3000);

/* メッセージ受信時イベント */
client.on('message', (message) =>
{
	var earnWord;		/* 学習した単語 */

	if ( earnUser == message.author.id )
	{
		if ( earnPhase == 1 )
		{	/* クエリを設定 */
			if ( message.content != "キャンセル" )
			{
				earnQuery = message.content;
				console.log(earnQuery);
				earnPhase = 2;
				message.channel.send("ζ\*\'ヮ\'\)ζ＜なんて返せばいいですか？");
			}
			else
			{
				message.channel.send("キャンセルしましたー")
				earnResp = 0;
				earnQuery = 0;
				earnPhase = 0;
			}
		}
		else if ( earnPhase == 2 )
		{	/* 返すレスポンスを設定 */
			if ( message.content != "キャンセル" )
			{
				earnResp = message.content;
				console.log(earnResp);

				/* エスケープ文字を変換 */
				earnQuery = escapeRegExp(earnQuery);
				earnResp = escapeRegExp(earnResp);

				/* tomlに出力 */
				fs.writeFileSync("Response/" + message.author.id + ".txt", earnResp, 'UTF-8');
				fs.writeFileSync("Query/" + message.author.id + ".txt", earnQuery, 'UTF-8');

				/* ファイルサイズをチェックしてみて正常か判断 */
				earnFileStatQuery = fs.statSync("Query/" + message.author.id + ".txt", 'UTF-8');
				earnFileStatResp = fs.statSync("Response/" + message.author.id + ".txt", 'UTF-8');
				if ( (earnFileStatQuery.size != 0) && (earnFileStatResp.size != 0)  )
				{	/* ファイルが空でない */
					message.channel.send("ζ\*\'ヮ\'\)ζ＜うっうー！覚えましたよー！");
				}
				else
				{
					message.channel.send("ζ\*\'ヮ\'\)ζ＜ごめんなさい、私にはむずかしいです…")
				}
				earnResp = 0;
				earnQuery = 0;
				earnPhase = 0;
			}
			else
			{
				message.channel.send("キャンセルしましたー");
				earnResp = 0;
				earnQuery = 0;
				earnPhase = 0;
			}
		}
	}
	/* 自分の発言に応答しないようブロック */
	if ( (message.channel.name == 'やよいとおしゃべり') && (message.author.id != client.user.id))
	{
		QueryTblCheck(message);
		if ( (message.content.match("単語覚えてほしい")) && (earnPhase == 0) )
		{
			console.log("単語");
			earnResp = 0;
			earnQuery = 0;
			message.channel.send("ζ\*\'ヮ\'\)ζ＜わかりました！何を覚えますか？");
			earnUser = message.author.id;
			earnPhase = 1;
		}
		if ( message.content.match(/.*もやし.*確認.*/) )
		{
			moyashiData = fs.readFileSync("moyashi/" + message.author.id + ".txt", 'binary');
			message.channel.send("ζ\*\'ヮ\'\)ζ＜もやしは " + moyashiData +" だけ溜まってますよー！");
		}
		else if ( message.content.match(/^:yayoi:$/) )
		{
			message.delete();
			message.channel.send(message.member.displayName + "さんからのスタンプですー", {
			file: "yayoi_hiru.png" // Or replace with FileOptions object
			});
		}
		// ダイスロール
		else if ( message.content.match(/[1-9]d[1-9][0-9]*$/) )
		{
			var diceNum = new DiceRoll(message);
			console.log(message.content);
			diceNum.SetMess();
		}
		else
		{
			/* ユーザが登録したレスポンスを検索 */
			earnWord = isExistFile("Query/" + message.author.id + ".txt");
			earnWord &= isExistFile("Response/" + message.author.id + ".txt");
			if ( earnWord != false )
			{
				earnWord = fs.readFileSync("Query/" + message.author.id + ".txt", 'UTF-8');
				earnFileStatQuery = fs.statSync("Query/" + message.author.id + ".txt", 'UTF-8');
				earnFileStatResp = fs.statSync("Response/" + message.author.id + ".txt", 'UTF-8');
				if ( (message.content.match(earnWord))
					&& (earnFileStatQuery.size != 0) && (earnFileStatResp != 0) )
				{	/* 覚えた単語かつ登録単語サイズが0バイトでないとき */
					respStr = fs.readFileSync("Response/" + message.author.id + ".txt", 'UTF-8');
					respMess = message;
					respQuery = 1;
					message.channel.startTyping(2);
				}
			}
		}
	}
});

/* 返答チェック */
function QueryTblCheck(message)
{
	var moyashiData;
	var moyashiValue = 0;
	var moyashiFile;

	/* 返答するキーワード分だけループ */
	for ( loop = 0; loop < data.queryTbl.arr.length; loop ++ )
	{
		if ( message.content.match(data.queryTbl.arr[loop]) )
		{	/* 反応するワードと一致 */
			queryTblNum = loop;
			respStr = data.respTbl[(dayState * TIMESTATE_NUM) + timeState].arr[queryTblNum];
			respMess = message;
			respQuery = 1;
			message.channel.startTyping(2);

			/* ここからもやし処理 */
			moyashiFile = isExistFile("moyashi/" + message.author.id + ".txt");
			if ( moyashiFile != false )
			{
				moyashiData = fs.readFileSync("moyashi/" + message.author.id + ".txt", 'binary');
				if ( typeof(moyashiData) === 'undefined' )
				{
					console.log("もやしトークン初期化");
					moyashiValue = 1;
				}
				else
				{
					moyashiData ++;
					moyashiValue = moyashiData;
				}
			}
			else
			{
				moyashiValue = 1;
			}
			console.log("moyashiValue = " + moyashiValue);
			fs.writeFileSync("moyashi/" + message.author.id + ".txt", moyashiValue, 'binary');
			break;
		}
	}
}
function isExistFile(file) {
  try {
    fs.statSync(file);
    return true
  } catch(err) {
    if(err.code === 'ENOENT') return false
  }
}

function escapeRegExp(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

/////////////////////////////////////////////////////////////////////////////
//ダイスを振る。
function DiceRoll(message)
{
	// ダイスの個数
	this.Num = Number(message.content.charAt(0));
	// ダイスの面
	this.Men = Number(message.content.substring(2,message.content.length));
	this.time = new Date();
	this.diceResult = 0;
	this.diceResultArr = "";
	this.SetMess = () =>
	{
		var tempDiceResult = 0;
		if ( (0 != this.Num) && (0 != this.Men) )
		{
			for(i = 0; i < this.Num; i ++)
			{
				tempDiceResult = Math.floor(((Math.random() * 1000) + this.time.getMilliseconds()) % this.Men);
				this.diceResult += tempDiceResult
				this.diceResultArr += tempDiceResult + ","
			}
		}
		respStr = "ζ\*\'ヮ\'\)ζ＜" + this.diceResultArr + "で\r\n合計が" + this.diceResult + "でしたよー！"
		respMess = message
		respQuery = 1;
		message.channel.startTyping(2);
	}
}

client.login(process.env.YAYOIBOT_TOKEN);
