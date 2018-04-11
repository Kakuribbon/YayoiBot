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
var queryTblNum;		/* クエリで一致した配列番号 */
var earnUser;		/* 学習させようとしているユーザー */
var earnQuery;		/* 学習させようとしているクエリ */
var earnResp;		/* 学習させようとしているレスポンス */
var earnPhase = 0;	/* 学習フェーズ */

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
	console.log("timeState = " + timeState);
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
			console.log("timeState = " + timeState);
		}
	}
	else if ( hour >= 6 )
	{
		if ( timeState == 0 )
		{
			timeState = 1;
			client.user.setAvatar('yayoi_hiru.png');
			console.log("timeState = " + timeState);
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
				earnQuery = 0;
				earnPhase = 0;
			}
		}
		else if ( earnPhase == 2 )
		{	/* 返すレスポンスを設定 */
			if ( message.content != "キャンセル" )
			{
				earnQuery = message.content;
				console.log(earnQuery);
				earnPhase = 2;
				/* tomlに出力 */
				
				message.channel.send("ζ\*\'ヮ\'\)ζ＜うっうー！覚えましたよー！");
				earnQuery = 0;
				earnPhase = 0;
			}
			else
			{
				message.channel.send("キャンセルしましたー");
				earnQuery = 0;
				earnPhase = 0;
			}
		}
	}
	/* 自分の発言に応答しないようブロック */
	if ( (message.channel.name == 'やよいとおしゃべり') && (message.author.id != client.user.id))
	{
		QueryTblCheck(message);
		if ( (message.content.match("単語覚えてくれないか？")) && (earnPhase == 0) )
		{
			console.log("単語");
			message.channel.send("ζ\*\'ヮ\'\)ζ＜わかりました！何を覚えますか？");
			earnUser = message.author.id;
			earnPhase = 1;
		}
		if ( message.content.match(/.*もやし確認.*/) )
		{
			moyashiData = fs.readFileSync("moyashi/" + message.author.id + ".txt", 'binary');
			message.channel.send("ζ\*\'ヮ\'\)ζ＜もやしは " + moyashiData +" だけ溜まってますよー！");
		}
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
	var moyashiData;
	var moyashiValue = 0;
	var moyashiFile;

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

client.login(process.env.YAYOIBOT_TOKEN);
