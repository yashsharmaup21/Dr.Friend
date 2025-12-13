/* ======= Local-storage records implementation ======= */
/* keys: record object stored in localStorage as 'drfriend_records' with structure:
{
  bill: [ {id,name,data,mime,date}, ... ],
  prescription: [...],
  report: [...],
  other: [...]
}
*/
const STORAGE_KEY = "drfriend_records";
const TRASH_KEY = "drfriend_trash";

/* helper: read / write records */
function loadRecords() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { bill: [], prescription: [], report: [], other: [] };
  try { return JSON.parse(raw); } catch { return { bill: [], prescription: [], report: [], other: [] }; }
}
function saveRecords(rec) { localStorage.setItem(STORAGE_KEY, JSON.stringify(rec)); }

/* helper: trash read/write */
function loadTrash() {
  const raw = localStorage.getItem(TRASH_KEY);
  if (!raw) return []; // flat array of items {id,name,data,mime,date,category}
  try { return JSON.parse(raw); } catch { return []; }
}
function saveTrash(arr) { localStorage.setItem(TRASH_KEY, JSON.stringify(arr)); }

/* UI refs */
const addBtn = document.getElementById('addBtn');
const typePopup = document.getElementById('typePopup');
const uploadPopup = document.getElementById('uploadPopup');
const uploadTitle = document.getElementById('uploadTitle');
const fileInput = document.getElementById('fileInput');
const fileNameInput = document.getElementById('fileNameInput');
const uploadSave = document.getElementById('uploadSave');

const viewPopup = document.getElementById('viewPopup');
const viewTitle = document.getElementById('viewTitle');
const viewList = document.getElementById('viewList');

const trashPopup = document.getElementById('trashPopup');
const trashTitle = document.getElementById('trashTitle');
const trashList = document.getElementById('trashList');

const previewPopup = document.getElementById('previewPopup');
const previewArea = document.getElementById('previewArea');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const downloadPreview = document.getElementById('downloadPreview');
const copyLinkBtn = document.getElementById('copyLinkBtn');
const shareNativeBtn = document.getElementById('shareNativeBtn');
const shareWarning = document.getElementById('shareWarning');

const profileIcon = document.getElementById('profileIcon');
const profilePopup = document.getElementById('profilePopup');
const profileImg = document.getElementById('profileImg');
const changePicBtn = document.getElementById('changePicBtn');
const profilePicInput = document.getElementById('profilePicInput');
const profileName = document.getElementById('profileName');
const profileEmail = document.getElementById('profileEmail');
const profilePhone = document.getElementById('profilePhone');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const logoutBtn = document.getElementById('logoutBtn');

const cardViewButtons = document.querySelectorAll('.card-view');
const trashBtn = document.getElementById('trashBtn');

let records = loadRecords();
let selectedType = null;
let currentViewCategory = null;
let currentViewList = [];
let currentIndex = 0;

/* initialize counts on load */
function refreshCounts() {
  records = loadRecords();
  document.getElementById('billCount').textContent = (records.bill||[]).length + " files";
  document.getElementById('reportCount').textContent = (records.report||[]).length + " files";
  document.getElementById('prescriptionCount').textContent = (records.prescription||[]).length + " files";
  document.getElementById('otherCount').textContent = (records.other||[]).length + " files";
}
refreshCounts();

/* preserve your theme toggle (if exists) */
const themeToggle = document.getElementById('themeToggle');
if (themeToggle) themeToggle.addEventListener('click', ()=> document.body.classList.toggle('dark'));

/* addBtn shows type popup (same flow as your original) */
addBtn.addEventListener('click', ()=> typePopup.classList.remove('hidden'));

/* trash button opens trash popup */
trashBtn.addEventListener('click', ()=> openTrashPopup());

/* close buttons (generic) */
document.querySelectorAll('[data-close]').forEach(btn=>{
  btn.addEventListener('click', e=>{
    const id = e.currentTarget.getAttribute('data-close');
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
});

/* type options: choose category then open upload popup */
document.querySelectorAll('.type-option').forEach(btn=>{
  btn.addEventListener('click', e=>{
    selectedType = e.currentTarget.dataset.type; // 'bill' | 'prescription' | 'report' | 'other'
    uploadTitle.innerText = `Upload ${selectedType.charAt(0).toUpperCase()+selectedType.slice(1)}`;
    typePopup.classList.add('hidden');
    uploadPopup.classList.remove('hidden');
  });
});

/* uploadSave: read file, convert to base64 and store under selectedType */
uploadSave.addEventListener('click', async ()=>{
  const file = fileInput.files[0];
  if(!file){ alert('Choose a file first'); return; }
  if(!selectedType){ alert('Select a category first'); return; }
  const name = (fileNameInput.value || file.name).trim();
  const reader = new FileReader();
  reader.onload = function(e){
    const dataUrl = e.target.result; // base64 data URL
    const rec = loadRecords();
    rec[selectedType] = rec[selectedType] || [];
    rec[selectedType].push({
      id: Date.now() + '-' + Math.random().toString(36).slice(2,7),
      name: name,
      data: dataUrl,
      mime: file.type || '',
      date: new Date().toLocaleString()
    });
    saveRecords(rec);
    // cleanup
    fileInput.value = '';
    fileNameInput.value = '';
    uploadPopup.classList.add('hidden');
    selectedType = null;
    refreshCounts();
  };
  reader.readAsDataURL(file);
});

/* card View buttons: open the view popup for given category */
cardViewButtons.forEach(btn=>{
  btn.addEventListener('click', async (e)=>{
    const cat = btn.dataset.open; // 'bill' etc
    openViewCategory(cat);
  });
});

/* openViewCategory builds the list for that category inside viewPopup */
async function openViewCategory(category){
  currentViewCategory = category;
  records = loadRecords();
  currentViewList = records[category] || [];
  viewTitle.innerText = `${category.charAt(0).toUpperCase()+category.slice(1)} (${currentViewList.length})`;
  viewList.innerHTML = '';
  if(currentViewList.length === 0){
    viewList.innerHTML = `<p style="color:var(--muted)">No records in this category.</p>`;
  } else {
    currentViewList.forEach((item, idx)=>{
      const row = document.createElement('div');
      row.className = 'item-row';
      const left = document.createElement('div'); left.className = 'item-left';
      const thumb = document.createElement('div'); thumb.className = 'thumb';
      const mime = item.mime || '';
      if(mime.startsWith('image/')){
        const img = document.createElement('img');
        img.src = item.data;
        thumb.appendChild(img);
      } else if(mime.includes('pdf')){
        const ifr = document.createElement('iframe');
        ifr.src = item.data;
        thumb.appendChild(ifr);
      } else {
        const icon = document.createElement('div'); icon.className = 'file-icon';
        const ext = (item.name.split('.').pop() || '').toUpperCase();
        icon.textContent = ext || 'FILE';
        thumb.appendChild(icon);
      }
      const meta = document.createElement('div'); meta.className = 'item-meta';
      meta.innerHTML = `<div class="item-name">${item.name}</div><div>${item.date}</div>`;
      left.appendChild(thumb); left.appendChild(meta);

      const right = document.createElement('div'); right.className = 'item-right';
      const v = document.createElement('button'); v.textContent = 'View'; v.className='action-btn';
      v.style.background='transparent'; v.style.border=`1px solid var(--accent)`; v.style.color='var(--accent)';
      v.addEventListener('click', ()=> openPreviewFromRecords(idx));
      const d = document.createElement('button'); d.textContent='Download'; d.className='action-btn';
      d.addEventListener('click', ()=> downloadFileByIndex(category, idx));
      const shareBtn = document.createElement('button'); shareBtn.textContent='Share'; shareBtn.className='action-btn alt';
      shareBtn.addEventListener('click', ()=> shareItem(category, idx));
      const del = document.createElement('button'); del.textContent='Delete'; del.className='action-btn';
      del.style.background='#b82f2f'; del.style.color='#fff';
      del.addEventListener('click', async ()=>{ // MOVE TO TRASH instead of permanent delete
        if(confirm('Move this record to Trash?')){
          await moveToTrash(category, idx);
          refreshCounts();
          openViewCategory(category);
        }
      });
      right.appendChild(v); right.appendChild(d); right.appendChild(shareBtn); right.appendChild(del);

      row.appendChild(left); row.appendChild(right);
      viewList.appendChild(row);
    });
  }
  viewPopup.classList.remove('hidden');
}

/* MOVE TO TRASH */
function moveToTrash(category, idx){
  const rec = loadRecords();
  const arr = rec[category] || [];
  if(!arr[idx]) return;
  const item = arr.splice(idx,1)[0];
  saveRecords(rec);
  // add category info and push to trash
  const trash = loadTrash();
  trash.unshift(Object.assign({}, item, { category })); // newest first
  saveTrash(trash);
  return Promise.resolve();
}

/* open trash popup & render */
function openTrashPopup(){
  const trash = loadTrash();
  trashTitle.innerText = `Trash (${trash.length})`;
  trashList.innerHTML = '';
  if(trash.length === 0){
    trashList.innerHTML = `<p style="color:var(--muted)">Trash is empty.</p>`;
  } else {
    trash.forEach((item, idx)=>{
      const row = document.createElement('div'); row.className = 'item-row';
      const left = document.createElement('div'); left.className = 'item-left';
      const thumb = document.createElement('div'); thumb.className = 'thumb';
      const mime = item.mime || '';
      if(mime.startsWith('image/')){
        const img = document.createElement('img'); img.src = item.data; thumb.appendChild(img);
      } else if(mime.includes('pdf')){
        const ifr = document.createElement('iframe'); ifr.src = item.data; thumb.appendChild(ifr);
      } else {
        const icon = document.createElement('div'); icon.className = 'file-icon';
        const ext = (item.name.split('.').pop() || '').toUpperCase();
        icon.textContent = ext || 'FILE';
        thumb.appendChild(icon);
      }
      const meta = document.createElement('div'); meta.className = 'item-meta';
      meta.innerHTML = `<div class="item-name">${item.name}</div><div>${item.category} • ${item.date}</div>`;
      left.appendChild(thumb); left.appendChild(meta);

      const right = document.createElement('div'); right.className = 'item-right';
      const v = document.createElement('button'); v.textContent = 'View'; v.className='action-btn';
      v.style.background='transparent'; v.style.border=`1px solid var(--accent)`; v.style.color='var(--accent)';
      v.addEventListener('click', ()=> openPreviewFromTrash(idx));
      const restore = document.createElement('button'); restore.textContent='Restore'; restore.className='action-btn';
      restore.addEventListener('click', ()=> {
        if(confirm('Restore this file to its category?')){
          restoreFromTrash(idx);
          openTrashPopup();
          refreshCounts();
        }
      });
      const perm = document.createElement('button'); perm.textContent='Delete Permanently'; perm.className='action-btn';
      perm.style.background='#b82f2f'; perm.style.color='#fff';
      perm.addEventListener('click', ()=> {
        if(confirm('Permanently delete this file? This cannot be undone.')){
          permanentlyDeleteFromTrash(idx);
          openTrashPopup();
        }
      });

      right.appendChild(v); right.appendChild(restore); right.appendChild(perm);
      row.appendChild(left); row.appendChild(right);
      trashList.appendChild(row);
    });
  }
  trashPopup.classList.remove('hidden');
}

/* RESTORE from trash */
function restoreFromTrash(idx){
  const trash = loadTrash();
  const item = trash.splice(idx,1)[0];
  if(!item) return;
  saveTrash(trash);
  const rec = loadRecords();
  const cat = item.category || 'other';
  rec[cat] = rec[cat] || [];
  // remove category field before pushing
  const toPush = Object.assign({}, item);
  delete toPush.category;
  rec[cat].push(toPush);
  saveRecords(rec);
  refreshCounts();
}

/* Permanently delete from trash */
function permanentlyDeleteFromTrash(idx){
  const trash = loadTrash();
  trash.splice(idx,1);
  saveTrash(trash);
}

/* PREVIEW logic for items inside currentViewList (index based) */
/* We add two functions to open preview from either records or trash */
function openPreviewFromRecords(index){
  currentViewList = loadRecords()[currentViewCategory] || [];
  currentIndex = index;
  showPreview();
  previewPopup.classList.remove('hidden');
}
function openPreviewFromTrash(index){
  currentViewList = loadTrash() || [];
  currentIndex = index;
  showPreview();
  previewPopup.classList.remove('hidden');
}

function showPreview(){
  previewArea.innerHTML = '';
  if(!currentViewList || currentViewList.length === 0) return;
  const item = currentViewList[currentIndex];
  if(!item) return;
  const mime = item.mime || '';
  if(mime.startsWith('image/')){
    const img = document.createElement('img'); img.src = item.data;
    previewArea.appendChild(img);
  } else if(mime.includes('pdf')){
    const ifr = document.createElement('iframe'); ifr.src = item.data;
    previewArea.appendChild(ifr);
  } else {
    const box = document.createElement('div'); box.style.display='flex'; box.style.flexDirection='column'; box.style.alignItems='center'; box.style.gap='12px';
    const ext = (item.name.split('.').pop() || '').toUpperCase();
    const icon = document.createElement('div'); icon.className='file-icon'; icon.style.fontSize='28px'; icon.textContent = ext || 'FILE';
    const name = document.createElement('div'); name.textContent = item.name;
    const date = document.createElement('div'); date.textContent = item.date;
    box.appendChild(icon); box.appendChild(name); box.appendChild(date);
    previewArea.appendChild(box);
  }

  // actions:
  downloadPreview.onclick = ()=> {
    // if currentViewList is trash list then download from that item
    const itemNow = currentViewList[currentIndex];
    if(itemNow && itemNow.data){
      const a = document.createElement('a');
      a.href = itemNow.data;
      a.download = itemNow.name || ('file.' + (itemNow.mime ? itemNow.mime.split('/').pop() : 'bin'));
      document.body.appendChild(a); a.click(); a.remove();
    }
  };

  copyLinkBtn.onclick = async ()=>{
    const curr = currentViewList[currentIndex];
    if(!curr){ alert('File not found'); return; }
    try{
      await navigator.clipboard.writeText(curr.data);
      shareWarning.innerText = "Copied data URL to clipboard (works on this device).";
    }catch(e){ alert('Copy failed'); }
  };
  shareNativeBtn.onclick = async ()=>{
    const curr = currentViewList[currentIndex];
    if(!curr){ alert('File not found'); return; }
    try{
      if(navigator.canShare && navigator.canShare({ files: [] }) ){
        alert('Native file share may be limited in this browser. Use Download or Copy Link.');
      } else if(navigator.share){
        await navigator.share({ title: curr.name, text: `File: ${curr.name}` });
      } else {
        const msg = encodeURIComponent(`Here's the file: ${curr.name}`);
        window.open(`https://wa.me/?text=${msg}`, '_blank');
      }
    }catch(e){
      console.error('share err', e);
      alert('Share failed.');
    }
  };

  if(navigator.canShare && navigator.canShare({ files: [] })){
    shareWarning.innerText = "You can share this file via native share (if supported).";
  } else {
    shareWarning.innerText = "For cross-device sharing, use Download or upload to a cloud; Copy Link copies the data URL (works locally).";
  }
}

/* Prev / Next on preview */
prevBtn.addEventListener('click', ()=> {
  if(!currentViewList || currentViewList.length===0) return;
  currentIndex = (currentIndex - 1 + currentViewList.length) % currentViewList.length;
  showPreview();
});
nextBtn.addEventListener('click', ()=> {
  if(!currentViewList || currentViewList.length===0) return;
  currentIndex = (currentIndex + 1) % currentViewList.length;
  showPreview();
});

/* Download by index (works for main records; trash uses download from preview or direct) */
function downloadFileByIndex(category, idx){
  const rec = loadRecords();
  const item = rec[category] && rec[category][idx];
  if(!item) return;
  const a = document.createElement('a');
  a.href = item.data;
  a.download = item.name || ('file.' + (item.mime ? item.mime.split('/').pop() : 'bin'));
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/* Share item (opens preview and attempts native share) */
function shareItem(category, idx){
  currentViewCategory = category;
  records = loadRecords();
  currentViewList = records[category] || [];
  currentIndex = idx;
  showPreview();
  previewPopup.classList.remove('hidden');
}

/* PROFILE: load / save (drfriend_profile) */
function loadProfileToUI(){
  try{
    const raw = localStorage.getItem('drfriend_profile');
    if(!raw) return;
    const p = JSON.parse(raw);
    profileName.value = p.name || '';
    profileEmail.value = p.email || '';
    profilePhone.value = p.phone || '';
    if(p.image){
      profileImg.src = p.image;
      profileIcon.src = p.image;
    }
  }catch(e){ console.error(e); }
}
loadProfileToUI();

saveProfileBtn.addEventListener('click', ()=>{
  const p = { name: profileName.value.trim(), email: profileEmail.value.trim(), phone: profilePhone.value.trim(), image: profileImg.src };
  localStorage.setItem('drfriend_profile', JSON.stringify(p));
  profileIcon.src = p.image || profileIcon.src;
  alert('Profile saved!');
});

changePicBtn.addEventListener('click', ()=> profilePicInput.click());
profilePicInput.addEventListener('change', function(){
  const f = this.files[0];
  if(!f) return;
  const r = new FileReader();
  r.onload = (e)=> {
    profileImg.src = e.target.result;
    profileIcon.src = e.target.result;
  };
  r.readAsDataURL(f);
});

logoutBtn.addEventListener('click', ()=>{
  if(!confirm('Logout will clear profile (not your records). Continue?')) return;
  localStorage.removeItem('drfriend_profile');
  profileImg.src = './logo/Profile.png';
  profileIcon.src = './logo/Profile.png';
  profileName.value = ''; profileEmail.value = ''; profilePhone.value = '';
  alert('Profile cleared.');
});

profileIcon.addEventListener('click', ()=> profilePopup.classList.remove('hidden'));

/* close popups by clicking overlay/back buttons */
document.querySelectorAll('.back-btn').forEach(btn=>{
  btn.addEventListener('click', (e)=>{
    const parent = e.currentTarget.closest('.popup');
    if(parent) parent.classList.add('hidden');
  });
});
document.querySelectorAll('.popup').forEach(p=>{
  p.addEventListener('click', function(e){
    if(e.target === this) this.classList.add('hidden');
  });
});

const chatbotBtn = document.getElementById("chatbotBtn");
const chatPopup = document.getElementById("chatPopup");
const closeChat = document.getElementById("closeChat");
const chatInput = document.getElementById("chatInput");
const sendChat = document.getElementById("sendChat");
const chatMessages = document.getElementById("chatMessages");

/* Open Chat */
chatbotBtn.addEventListener("click", () => {
  chatPopup.classList.remove("hidden");
});

/* Close Chat */
closeChat.addEventListener("click", () => {
  chatPopup.classList.add("hidden");
});

/* Send Message */
sendChat.addEventListener("click", sendMessage);
chatInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;

  // User message bubble
  const userMsg = document.createElement("div");
  userMsg.className = "user-msg";
  userMsg.innerText = text;
  chatMessages.appendChild(userMsg);

  chatInput.value = "";

  // Auto-reply (simple bot)
  setTimeout(() => {
    const botMsg = document.createElement("div");
    botMsg.className = "bot-msg";

    // simple hardcoded responses
    if (text.includes("upload")) {
      botMsg.innerText = "To upload a report, click the + button!";
    } else if (text.includes("profile")) {
      botMsg.innerText = "Your profile is available at the top right corner.";
    } else if (text.includes("delete")) {
      botMsg.innerText = "Deleted reports go to the Trash section.";
    } else {
      botMsg.innerText = "I'm not sure, but I'm learning! 😊";
    }

    chatMessages.appendChild(botMsg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }, 400);

  chatMessages.scrollTop = chatMessages.scrollHeight;
}