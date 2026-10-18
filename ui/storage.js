/* Portable save UI. Only user-triggered imports can replace a valid save slot. */
(function(){
 const $=id=>document.getElementById(id),status=text=>$('backupStatus').textContent=text;
 function importText(text){try{if(typeof state!=='undefined'&&state&&!confirm('Заменить текущую партию импортированным сохранением?'))return;DeveloperStorage.import(text);status('Партия восстановлена.');}catch(error){status('Импорт отклонён: '+error.message);}}
 $('backupExport').onclick=()=>{try{const blob=new Blob([DeveloperStorage.export()],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='developer-v019-save.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Резервная копия скачана.');}catch(error){status(error.message);}};
 $('backupImport').onclick=()=>$('backupFile').click();
 $('backupFile').onchange=async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>5000000)throw Error('Файл больше 5 МБ');importText(await file.text());}catch(error){status(error.message);}event.target.value='';};
 $('backupLegacy').onclick=()=>{try{const raw=localStorage.getItem('developer-html-save');if(!raw)throw Error('Сохранение v0.18 на этом адресе не найдено');importText(raw);}catch(error){status(error.message);}};
})();
