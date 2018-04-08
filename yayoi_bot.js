require('dotenv').config();
const Discord = require('discord.js');
const BotData = require('toml');
const { promisify } = require("util");
const fs = require("fs");
const readFileAsync = promisify(fs.readFile);
const client = new Discord.Client();
var hour, youbi;
var hour = 1000 * 60 * 60;
var timeState;		/* 0:夜、1:朝昼 */
var dayState;		/* 0：日曜～6：土曜 */
var respQuery = 0;	/* 0:返答要求なし、1～:返答要求あり */
var respStr;		/* 返答文字列 */
var respMess;		/* レスポンスメッセージオブジェクト */
var data;
var queryTblNum		/* クエリで一致した配列番号 */

// tomlファイルの読み込み
readFileAsync("yayoi.toml").then(obj => {
	data = BotData.parse(obj);
});

client.on('ready', () => {
	console.log('ログインしました');
	var time = new Date();
	if (time.getHours() >= 20)
	{
		timeState = 1;
	}
	else
	{
		timeState = 0;
	}
	console.log(timeState);
	dayState = time.getDay();
});

setInterval(function()
{
	var time = new Date();
	hour = time.getHours();
	dayState = time.getDay();

	if ( hour >= 20 )
	{
		if ( timeState == 1 )
		{
			timeState = 0;
			client.user.setAvatar('yayoi_yoru.png');
			console.log(timeState);
		}
	}
	else if ( hour >= 6 )
	{
		if ( timeState == 0 )
		{
			timeState = 1;
			client.user.setAvatar('yayoi_hiru.png');
			console.log(timeState);
		}
	}
//	console.log(hour);
},180000);

setInterval(function()
{	/* 3秒毎に呼び出し */
	if ( respQuery == 1 )
	{
		respMess.channel.send(respStr);
		respQuery = 0;
		respMess.channel.stopTyping();
	}
},3000);

/* メッセージ受信時イベント */
client.on('message', (message) => 
{
	/* 自分の発言に応答しないようブロック */
	if ( (message.channel.name == 'やよいとおしゃべり') && (message.author.id != client.user.id))
	{
		QueryTblCheck(message);
		if ( message.content.match(/^:yayoi:$/) )
		{
			message.delete();
			message.channel.send(message.member.displayName + "さんからのスタンプですー", {
			file: "yayoi_hiru.png" // Or replace with FileOptions object
			});
		}
	}
});

/* 返答チェック */
function QueryTblCheck(message)
{
	/* 返答するキーワード分だけループ */
	for ( loop = 0; loop < data.queryTbl.arr.length; loop ++ )
	{
		if ( message.content.match(data.queryTbl.arr[loop]) )
		{	/* 反応するワードと一致 */
			queryTblNum = loop;
			respStr = data.respTbl[(dayState * 2) + timeState].arr[queryTblNum];
			respMess = message;
			respQuery = 1;
			message.channel.startTyping();
		}
	}
}

client.login(process.env.YAYOIBOT_TOKEN);
