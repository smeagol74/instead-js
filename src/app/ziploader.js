/* global Promise, Uint8Array, TextDecoder */
var $ = require('jquery');

var JSZip = require('jszip');

var Game = require('./game');
var Instead = require('./instead');
var UI = require('./ui');
var i18n = require('./i18n');

var decoder = new TextDecoder('utf-8');

var gamepath = './games/';

function matchRe(regexp, string) {
    var isMatching = string.match(regexp);
    if (isMatching) {
        return isMatching[1].trim();
    }
    return '';
}

var ZipLoader = {
    init: function init() {
        this.el = $('#manager');

        $('#ziploader').html(
            '<input type="file" id="zip-game" style="font-size: 0.8em"/>' +
            '<label for="zip-game">&#128194; ' + i18n.t('zip') + '</label>'
        );

        this.el.on('change', '#zip-game',  function fileCtrl() {
            var reader = new FileReader();
            reader.onload = importGame;
            reader.readAsArrayBuffer(this.files[0]);
        });
    },
    startGame: function startGame(gameid, gameinfo) {
        Instead.initGame(gameinfo);
        this.hide();
        $('#stead-toolbar-info').html('<b>' + Game.name + '</b>');
        Instead.startGame(Game.autosaveID);
    },
    hide: function hide() {
        this.el.hide();
        UI.show();
        $('#stead-toolbar').show();
    }
};

function importGame(e) {
    var fileBuffer = [];
    var gameinfo = {};

    var filehandler = function zipFileHandler(zipEntry) {
        return zipEntry.async('arraybuffer')
        .then(function success(zcontent) {
            var pathParts = zipEntry.name.split('/');
            var filename = pathParts[pathParts.length - 1];
            var gameid = pathParts[0];
            gameinfo.id = gameid + '.zip';
            gameinfo.path = gamepath + gameid + '/';
            if (filename === 'theme.ini') {
                gameinfo.ownTheme = true;
            }
            if (filename === 'main.lua') {
                gameinfo.stead = 2;
            }
            if (filename === 'main3.lua') {
                gameinfo.stead = 3;
            }
            if (filename === 'main.lua' || filename === 'main3.lua') {
                var gf = decoder.decode(new Uint8Array(zcontent));
                gameinfo.name = matchRe(/\$Name\(ru\)\s*:\s*([^\$\n]+)/, gf);
                if (gameinfo.name === '') {
                    gameinfo.name = matchRe(/\$Name\s*:\s*([^\$\n]+)/, gf);
                    if (gameinfo.name === '') {
                        gameinfo.name = gameid;
                    }
                }
                gameinfo.details = {};
                gameinfo.details.author = matchRe(/\$Author\s*:\s*([^\$\n]+)/, gf);
                gameinfo.details.version = matchRe(/\$Version\s*:\s*([^\$\n]+)/, gf);
                gameinfo.details.info = matchRe(/\$Info\s*:\s*([^\$\n]+)/, gf);
            }

            var fullpath = gamepath + zipEntry.name;
            var fileContent = new Blob([zcontent]);
            var dataUrl = URL.createObjectURL(fileContent);
            Game.addFile(fullpath, dataUrl);
        });
    };

    $('#manager-gamelist').html('<a href="" id="loading">' + i18n.t('loading') + '</a>');

    JSZip.loadAsync(e.target.result).then(function handleZip(zip) {
        zip.forEach(function handleZipEntry(relativePath, entry) {
            fileBuffer.push(filehandler(entry));
        });
        Promise.all(fileBuffer).then(function startgame() {
            ZipLoader.startGame('provodnik', gameinfo);
        });
    });
}

module.exports = ZipLoader;