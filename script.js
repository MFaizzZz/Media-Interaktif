/* =========================================================
   Media Pembelajaran Interaktif — Pengenalan Jaringan Komputer
   script.js
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  if (document.body.classList.contains('simulation-body') || document.body.classList.contains('materi-body')) return;

  /* =======================================================
     1. NAVIGASI NAVBAR (SPA - tanpa reload halaman)
     ======================================================= */
  const navItems = document.querySelectorAll('.nav-item');
  const pages = document.querySelectorAll('.page');
  const topbarPage = document.getElementById('topbarPage');
  const navbar = document.getElementById('navbar');
  const navToggle = document.querySelector('.nav-toggle');
  const activePageStorageKey = 'jarkom-active-page';
  const simulationFrame = document.getElementById('simulationFrame');
  const materiFrame = document.getElementById('materiFrame');
  let pendingMaterialTopic = null;
  window.addEventListener('message', event => {
    if (simulationFrame && event.source === simulationFrame.contentWindow && event.data?.type === 'jarkom-simulation-height') {
      simulationFrame.style.height = `${Math.max(500, Math.min(2400, Number(event.data.height) || 900))}px`;
    }
  });

  function closeMobileMenu(){
    if (!navbar || !navToggle) return;
    navbar.classList.remove('menu-open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Buka menu navigasi');
  }

  if (navToggle) {
    navToggle.addEventListener('click', () => {
      const isOpen = navbar.classList.toggle('menu-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
      navToggle.setAttribute('aria-label', isOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi');
    });
  }

  function goToPage(target){
    pages.forEach(p => p.classList.toggle('active', p.id === 'page-' + target));
    navItems.forEach(n => n.classList.toggle('active', n.dataset.target === target));
    const activeItem = document.querySelector(`.nav-item[data-target="${target}"]`);
    if (activeItem && topbarPage) topbarPage.textContent = activeItem.textContent.trim();
    try { localStorage.setItem(activePageStorageKey, target); } catch (error) { /* abaikan */ }
    if (target === 'kuis' && isQuizUnlocked() && lastQuizResult) restoreQuizResult();
    closeMobileMenu();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  navItems.forEach(btn => {
    btn.addEventListener('click', () => goToPage(btn.dataset.target));
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMobileMenu();
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 760) closeMobileMenu();
  });

  // Semua tombol dengan atribut data-goto (dashboard, tombol "Mulai Belajar", dll)
  document.querySelectorAll('[data-goto]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.goto;
      goToPage(target);
      // Jika tombol juga menunjuk ke topik materi tertentu
      if (target === 'materi' && btn.dataset.materi) {
        goToTopic(btn.dataset.materi);
      }
    });
  });

  /* =======================================================
     2. TAB MATERI (Pengertian / Jenis / Topologi)
     ======================================================= */
  const tabs = document.querySelectorAll('.tab');
  const topicPanels = document.querySelectorAll('.topic-panel');

  function goToTopic(topic){
    tabs.forEach(t => t.classList.toggle('active', t.dataset.topic === topic));
    topicPanels.forEach(p => p.classList.toggle('active', p.id === 'topic-' + topic));
    pendingMaterialTopic = topic;
    materiFrame?.contentWindow?.postMessage({ type: 'jarkom-materi-topic', topic }, '*');
    document.getElementById('page-materi').scrollIntoView({ block: 'start' });
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => goToTopic(tab.dataset.topic));
  });

  document.querySelectorAll('[data-topic-goto]').forEach(btn => {
    btn.addEventListener('click', () => goToTopic(btn.dataset.topicGoto));
  });


  /* =======================================================
     3. LATIHAN / CEK PEMAHAMAN (di dalam materi)
     ======================================================= */
  const checkBoxes = document.querySelectorAll('.check-box');
  const progressStorageKey = 'jarkom-learning-progress';
  const quizVersion = '2';
  const completedChecks = new Set();
  const completedVideos = new Set();
  let quizFinished = false;
  let lastQuizResult = null;

  function sendMaterialState(){
    materiFrame?.contentWindow?.postMessage({ type: 'jarkom-materi-progress', checks: [...completedChecks], videos: [...completedVideos] }, '*');
  }

  function loadLearningProgress(){
    try {
      const savedProgress = JSON.parse(localStorage.getItem(progressStorageKey));
      if (!savedProgress) return;
      (savedProgress.completedChecks || []).forEach(check => completedChecks.add(check));
      (savedProgress.completedVideos || []).forEach(video => completedVideos.add(video));
      const isCurrentQuizVersion = savedProgress.quizVersion === quizVersion;
      quizFinished = isCurrentQuizVersion && Boolean(savedProgress.quizFinished);
      lastQuizResult = isCurrentQuizVersion ? (savedProgress.lastQuizResult || null) : null;
    } catch (error) {
      // Progress tetap dapat digunakan bila penyimpanan browser tidak tersedia.
    }
  }

  function updateLearningProgress(){
    const completedSteps = [
      ...['pengertian', 'jenis', 'topologi'].filter(check => completedChecks.has(check)),
      ...(quizFinished ? ['kuis'] : [])
    ];
    const totalSteps = 4;
    const percentage = Math.round((completedSteps.length / totalSteps) * 100);
    const progressFill = document.getElementById('learningProgressFill');
    const progressPercent = document.getElementById('learningProgressPercent');
    const progressCount = document.getElementById('learningProgressCount');
    const progressBar = document.querySelector('.learning-progress-track');

    if (progressFill) progressFill.style.width = percentage + '%';
    if (progressPercent) progressPercent.textContent = percentage + '%';
    if (progressCount) progressCount.textContent = completedSteps.length + ' dari ' + totalSteps + ' selesai';
    if (progressBar) progressBar.setAttribute('aria-valuenow', percentage);
    document.querySelectorAll('[data-progress-step]').forEach(step => {
      step.classList.toggle('done', completedSteps.includes(step.dataset.progressStep));
    });
    document.querySelectorAll('[data-video-status]').forEach(status => {
      const isDone = completedVideos.has(status.dataset.videoStatus);
      status.textContent = isDone ? 'Selesai ditonton' : 'Belum selesai';
      status.classList.toggle('done', isDone);
    });
    document.querySelectorAll('[data-video-note]').forEach(note => {
      if (completedVideos.has(note.dataset.videoNote)) note.textContent = '✓ Video selesai ditonton dan tercatat dalam progress belajar.';
    });

    sendMaterialState();
    updateQuizLockState();

    try {
      localStorage.setItem(progressStorageKey, JSON.stringify({
        completedChecks: [...completedChecks], completedVideos: [...completedVideos], quizVersion, quizFinished, lastQuizResult
      }));
    } catch (error) {
      // Abaikan bila browser memblokir localStorage.
    }
  }

  loadLearningProgress();

  window.addEventListener('message', event => {
    if (!materiFrame || event.source !== materiFrame.contentWindow) return;
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'jarkom-materi-ready') {
      sendMaterialState();
      if (pendingMaterialTopic) materiFrame.contentWindow.postMessage({ type: 'jarkom-materi-topic', topic: pendingMaterialTopic }, '*');
    } else if (data.type === 'jarkom-materi-height') {
      materiFrame.style.height = `${Math.max(600, Math.min(12000, Number(data.height) || 900))}px`;
    } else if (data.type === 'jarkom-materi-check' && ['pengertian', 'jenis', 'topologi'].includes(data.topic)) {
      completedChecks.add(data.topic);
      updateLearningProgress();
    } else if (data.type === 'jarkom-materi-video' && ['pengertian', 'jenis', 'topologi'].includes(data.topic)) {
      completedVideos.add(data.topic);
      updateLearningProgress();
    } else if (data.type === 'jarkom-materi-navigate' && data.page === 'kuis') {
      goToPage('kuis');
    }
  });

  const resetProgressBtn = document.getElementById('resetProgressBtn');
  if (resetProgressBtn) {
    resetProgressBtn.addEventListener('click', () => {
      const shouldReset = window.confirm('Reset seluruh progress belajar? Status materi, video, dan kuis akan kembali ke 0%.');
      if (!shouldReset) return;
      try { localStorage.removeItem(progressStorageKey); } catch (error) { /* lanjutkan reset di halaman */ }
      window.location.reload();
    });
  }

  checkBoxes.forEach(box => {
    const optButtons = box.querySelectorAll('.opt-btn');
    const feedback = box.querySelector('.check-feedback');

    optButtons.forEach(opt => {
      opt.addEventListener('click', () => {
        const isCorrect = opt.dataset.correct === 'true';

        optButtons.forEach(b => {
          b.disabled = true;
          if (b.dataset.correct === 'true') b.classList.add('correct');
        });
        if (!isCorrect) opt.classList.add('wrong');

        feedback.textContent = isCorrect
          ? '✓ Benar! Jawabanmu tepat.'
          : '✕ Kurang tepat. Jawaban yang benar sudah ditandai hijau di atas.';
        feedback.className = 'check-feedback ' + (isCorrect ? 'correct' : 'wrong');

        completedChecks.add(box.dataset.check);
        updateLearningProgress();
      });
    });

    if (completedChecks.has(box.dataset.check)) {
      optButtons.forEach(button => {
        button.disabled = true;
        if (button.dataset.correct === 'true') button.classList.add('correct');
      });
      feedback.textContent = 'Latihan singkat ini sudah selesai.';
      feedback.className = 'check-feedback correct';
    }
  });


  /* =======================================================
     4. VIDEO PENDUKUNG DI SETIAP MATERI
     ======================================================= */
  document.querySelectorAll('.lesson-video-player').forEach(video => {
    video.addEventListener('ended', () => {
      completedVideos.add(video.closest('[data-video-key]').dataset.videoKey);
      updateLearningProgress();
    });
  });

  /* =======================================================
     6. KUIS EVALUASI (15 soal)
     ======================================================= */
  const quizData = [
    {
      q: 'Apa yang dimaksud dengan jaringan komputer?',
      options: [
        'Dua atau lebih komputer beserta perangkat pendukung yang terhubung untuk berkomunikasi dan berbagi sumber daya',
        'Sebuah program untuk mengedit dokumen',
        'Perangkat keras untuk mencetak dokumen',
        'Aplikasi untuk menyimpan file di satu komputer saja'
      ],
      correct: 0,
      explain: 'Menurut modul, jaringan komputer terdiri atas dua atau lebih komputer serta perangkat pendukung yang dihubungkan dengan media agar dapat berkomunikasi dan berbagi sumber daya.'
    },
    {
      q: 'Berikut ini yang BUKAN merupakan tujuan jaringan komputer adalah...',
      options: [
        'Memungkinkan komunikasi antar perangkat',
        'Berbagi sumber daya seperti printer',
        'Menambah kecepatan prosesor komputer',
        'Mempermudah pertukaran informasi'
      ],
      correct: 2,
      explain: 'Jaringan komputer bertujuan untuk komunikasi dan berbagi sumber daya, bukan untuk menambah kecepatan prosesor.'
    },
    {
      q: 'Manfaat utama jaringan komputer bagi pengguna adalah...',
      options: [
        'Mengganti kebutuhan akan komputer',
        'Akses data lebih cepat dan bisa berbagi perangkat',
        'Menghilangkan kebutuhan akan internet',
        'Membuat komputer bekerja tanpa listrik'
      ],
      correct: 1,
      explain: 'Jaringan komputer memudahkan akses data yang lebih cepat serta memungkinkan berbagi perangkat seperti printer dan penyimpanan.'
    },
    {
      q: 'LAN (Local Area Network) biasanya digunakan pada cakupan wilayah...',
      options: [
        'Antar negara',
        'Satu ruangan, rumah, atau gedung bertingkat',
        'Satu kota besar',
        'Seluruh dunia'
      ],
      correct: 1,
      explain: 'LAN memiliki cakupan sangat terbatas, misalnya ruangan, rumah, atau gedung bertingkat, dengan jangkauan sekitar 10–300 meter.'
    },
    {
      q: 'Contoh penggunaan jaringan MAN adalah...',
      options: [
        'Jaringan WiFi di satu ruang kelas',
        'Jaringan antar kantor cabang bank dalam satu kota',
        'Jaringan internet global',
        'Koneksi dua laptop menggunakan kabel USB'
      ],
      correct: 1,
      explain: 'MAN (Metropolitan Area Network) menghubungkan beberapa LAN dalam cakupan satu kota, misalnya antar kantor cabang bank.'
    },
    {
      q: 'Jaringan yang mencakup wilayah geografis paling luas, bahkan antar negara, disebut...',
      options: [
        'LAN',
        'MAN',
        'WAN',
        'Internet'
      ],
      correct: 2,
      explain: 'WAN (Wide Area Network) mencakup wilayah yang sangat luas, mulai dari antar kota hingga antar negara, contohnya jaringan internet.'
    },
    {
      q: 'Topologi jaringan yang menggunakan satu kabel utama sebagai jalur komunikasi disebut...',
      options: [
        'Topologi Bus',
        'Topologi Star',
        'Topologi Ring',
        'Topologi Mesh'
      ],
      correct: 0,
      explain: 'Pada topologi bus, semua perangkat menggunakan satu kabel utama atau backbone sebagai jalur komunikasi.'
    },
    {
      q: 'Pada topologi star, semua perangkat dihubungkan ke...',
      options: [
        'Satu kabel utama',
        'Perangkat pusat',
        'Perangkat di sebelahnya dalam lingkaran',
        'Semua perangkat secara langsung'
      ],
      correct: 1,
      explain: 'Ciri utama topologi star adalah setiap perangkat memiliki koneksi sendiri ke perangkat pusat, seperti switch atau hub.'
    },
    {
      q: 'Pada topologi Ring, jalur komunikasi utama berbentuk...',
      options: [
        'Loop tertutup',
        'Jalur bercabang',
        'Satu perangkat pusat',
        'Hubungan langsung ke semua komponen'
      ],
      correct: 0,
      explain: 'Pada topologi Ring, komponen terhubung ke backbone yang berbentuk loop tertutup. Pada Token Ring, loop dapat dibentuk oleh perangkat MAU.'
    },
    {
      q: 'Dalam topologi Full Mesh, setiap komponen jaringan memiliki...',
      options: [
        'Jalur khusus langsung ke setiap komponen lain',
        'Satu kabel coaxial utama',
        'Satu perangkat pusat saja',
        'Hubungan dengan dua perangkat tetangga saja'
      ],
      correct: 0,
      explain: 'Pada Full Mesh, setiap komponen memiliki hubungan langsung atau jalur khusus ke setiap komponen lain dalam segmen jaringan.'
    },
    {
      q: 'Keunggulan utama topologi mesh adalah...',
      options: [
        'Membutuhkan paling sedikit kabel',
        'Memiliki beberapa jalur komunikasi cadangan',
        'Hanya dapat digunakan pada jaringan kecil',
        'Semua perangkat harus terhubung ke satu kabel utama'
      ],
      correct: 1,
      explain: 'Topologi mesh memiliki banyak koneksi antar perangkat sehingga data dapat memakai jalur lain apabila salah satu jalur mengalami gangguan.'
    },
    {
      q: 'Topologi yang memiliki struktur bertingkat seperti cabang pohon adalah...',
      options: [
        'Topologi Tree',
        'Topologi Bus',
        'Topologi Ring',
        'Topologi Star'
      ],
      correct: 0,
      explain: 'Topologi Tree menyusun beberapa jaringan secara hierarkis atau bertingkat, menyerupai cabang pohon.'
    },
    {
      q: 'Jika dua atau lebih topologi Star dihubungkan hingga membentuk Star baru, bentuk tersebut disebut...',
      options: [
        'Extended Star',
        'Full Mesh',
        'Linear Bus',
        'Partial Ring'
      ],
      correct: 0,
      explain: 'Modul menjelaskan bahwa dua atau lebih topologi Star yang dihubungkan sehingga membentuk Star baru disebut Extended Star.'
    },
    {
      q: 'Gangguan pada kabel utama pada topologi bus dapat menyebabkan...',
      options: [
        'Hanya perangkat terakhir yang terputus',
        'Kecepatan internet selalu meningkat',
        'Seluruh jaringan dapat terganggu',
        'Perangkat pusat mengambil alih jaringan'
      ],
      correct: 2,
      explain: 'Topologi bus menggunakan satu kabel utama sebagai backbone. Jika kabel tersebut bermasalah, komunikasi banyak atau seluruh perangkat dapat terganggu.'
    },
    {
      q: 'Contoh penggabungan topologi star dan bus termasuk topologi...',
      options: [
        'Hybrid',
        'Ring',
        'Mesh',
        'Tree'
      ],
      correct: 0,
      explain: 'Topologi hybrid adalah gabungan dari dua atau lebih jenis topologi, misalnya gabungan topologi star dan bus.'
    }
  ];

  let currentQuestion = 0;
  let userAnswers = new Array(quizData.length).fill(null);
  let activeQuestionIndexes = quizData.map((_, index) => index);
  let lastWrongQuestionIndexes = [];
  let reviewAnswers = new Array(quizData.length).fill(null);
  const retriedQuestionIndexes = new Set();

  const kuisIntro = document.getElementById('kuisIntro');
  const kuisRunning = document.getElementById('kuisRunning');
  const kuisHasil = document.getElementById('kuisHasil');
  const kuisReview = document.getElementById('kuisReview');

  const startQuizBtn = document.getElementById('startQuizBtn');
  const quizLockCard = document.getElementById('quizLockCard');
  const quizLockMessage = document.getElementById('quizLockMessage');
  const quizQuestion = document.getElementById('quizQuestion');
  const quizOptions = document.getElementById('quizOptions');
  const quizFeedback = document.getElementById('quizFeedback');
  const quizProgressText = document.getElementById('quizProgressText');
  const quizProgressFill = document.getElementById('quizProgressFill');
  const nextQuestionBtn = document.getElementById('nextQuestionBtn');
  const quizStatusNumber = document.getElementById('quizStatusNumber');
  const quizStatusTopic = document.getElementById('quizStatusTopic');
  const quizAnsweredCount = document.getElementById('quizAnsweredCount');
  const quizCorrectCount = document.getElementById('quizCorrectCount');

  function isQuizUnlocked(){
    return ['pengertian', 'jenis', 'topologi'].every(topic =>
      completedChecks.has(topic)
    );
  }

  function updateQuizLockState(){
    const isUnlocked = isQuizUnlocked();

    if (startQuizBtn) startQuizBtn.disabled = !isUnlocked;
    if (quizLockCard) quizLockCard.hidden = isUnlocked;
    if (quizLockMessage) {
      quizLockMessage.textContent = isUnlocked
        ? 'Semua syarat sudah selesai. Kuis evaluasi siap dikerjakan.'
        : 'Selesaikan latihan singkat pada 3 materi untuk membuka kuis.';
    }
    document.querySelectorAll('[data-requirement]').forEach(item => {
      const topic = item.dataset.requirement;
      const complete = completedChecks.has(topic);
      item.classList.toggle('complete', complete);
      item.setAttribute('aria-label', complete ? item.textContent + ': selesai' : item.textContent + ': belum selesai');
    });
    document.querySelectorAll('[data-target="kuis"], [data-goto="kuis"]').forEach(button => {
      button.classList.toggle('locked', !isUnlocked);
      button.setAttribute('aria-label', isUnlocked ? 'Kuis Evaluasi' : 'Kuis Evaluasi terkunci');
    });
  }

  updateLearningProgress();

  function showQuizSection(section){
    kuisIntro.style.display = section === 'intro' ? 'block' : 'none';
    kuisRunning.style.display = section === 'running' ? 'block' : 'none';
    kuisHasil.style.display = section === 'hasil' ? 'block' : 'none';
    kuisReview.style.display = section === 'review' ? 'block' : 'none';
  }

  function startQuiz(questionIndexes = quizData.map((_, index) => index)){
    currentQuestion = 0;
    const isRetryingWrongAnswers = questionIndexes.length < quizData.length;
    if (isRetryingWrongAnswers) {
      userAnswers = reviewAnswers.slice();
      questionIndexes.forEach(index => {
        userAnswers[index] = null;
        retriedQuestionIndexes.add(index);
      });
    } else {
      userAnswers = new Array(quizData.length).fill(null);
      reviewAnswers = new Array(quizData.length).fill(null);
      retriedQuestionIndexes.clear();
    }
    activeQuestionIndexes = questionIndexes;
    showQuizSection('running');
    renderQuestion();
  }

  function renderQuestion(){
    const questionIndex = activeQuestionIndexes[currentQuestion];
    const data = quizData[questionIndex];
    quizQuestion.textContent = data.q;
    quizOptions.innerHTML = '';
    quizFeedback.textContent = '';
    quizFeedback.className = 'quiz-feedback';
    nextQuestionBtn.disabled = true;
    nextQuestionBtn.textContent = currentQuestion === activeQuestionIndexes.length - 1 ? 'Lihat Hasil' : 'Soal Berikutnya';

    const letters = ['A', 'B', 'C', 'D'];
    data.options.forEach((optText, i) => {
      const btn = document.createElement('button');
      btn.className = 'opt-btn';
      const letter = document.createElement('span');
      letter.className = 'quiz-option-letter';
      letter.textContent = letters[i];
      btn.appendChild(letter);
      btn.appendChild(document.createTextNode(optText));
      btn.addEventListener('click', () => selectAnswer(i, btn));
      quizOptions.appendChild(btn);
    });

    quizProgressText.textContent = 'Soal ' + (currentQuestion + 1) + ' dari ' + activeQuestionIndexes.length;
    quizProgressFill.style.width = ((currentQuestion) / activeQuestionIndexes.length * 100) + '%';
    updateQuizStatus(questionIndex);
  }

  function selectAnswer(index, btnEl){
    const questionIndex = activeQuestionIndexes[currentQuestion];
    if (userAnswers[questionIndex] !== null) return; // sudah dijawab

    userAnswers[questionIndex] = index;
    const data = quizData[questionIndex];
    const allOptBtns = quizOptions.querySelectorAll('.opt-btn');

    allOptBtns.forEach((b, i) => {
      b.disabled = true;
      if (i === data.correct) b.classList.add('correct');
    });

    if (index !== data.correct) {
      btnEl.classList.add('wrong');
      quizFeedback.textContent = '✕ Salah. ' + data.explain;
      quizFeedback.classList.add('wrong');
    } else {
      quizFeedback.textContent = '✓ Benar! ' + data.explain;
      quizFeedback.classList.add('correct');
    }

    nextQuestionBtn.disabled = false;
    quizProgressFill.style.width = ((currentQuestion + 1) / activeQuestionIndexes.length * 100) + '%';
    updateQuizStatus(questionIndex);
  }

  function getTopicName(questionIndex){
    if (questionIndex <= 2) return 'Dasar Jaringan';
    if (questionIndex <= 5) return 'Jenis Jaringan';
    return 'Topologi Jaringan';
  }

  function updateQuizStatus(questionIndex){
    const answeredCount = activeQuestionIndexes.filter(index => userAnswers[index] !== null).length;
    const correctCount = activeQuestionIndexes.filter(index => userAnswers[index] === quizData[index].correct).length;
    quizStatusNumber.textContent = String(currentQuestion + 1).padStart(2, '0');
    quizStatusTopic.textContent = getTopicName(questionIndex);
    quizAnsweredCount.textContent = answeredCount + ' / ' + activeQuestionIndexes.length;
    quizCorrectCount.textContent = correctCount;
  }

  nextQuestionBtn.addEventListener('click', () => {
    if (currentQuestion < activeQuestionIndexes.length - 1) {
      currentQuestion++;
      renderQuestion();
    } else {
      finishQuiz();
    }
  });

  function finishQuiz(){
    quizFinished = true;
    quizProgressFill.style.width = '100%';

    const correctCount = activeQuestionIndexes.filter(index => userAnswers[index] === quizData[index].correct).length;
    const wrongCount = activeQuestionIndexes.length - correctCount;
    const percent = Math.round((correctCount / activeQuestionIndexes.length) * 100);
    lastWrongQuestionIndexes = activeQuestionIndexes.filter(index => userAnswers[index] !== quizData[index].correct);
    activeQuestionIndexes.forEach(index => { reviewAnswers[index] = userAnswers[index]; });

    lastQuizResult = {
      correctCount,
      wrongCount,
      percent,
      reviewAnswers: reviewAnswers.slice(),
      lastWrongQuestionIndexes: lastWrongQuestionIndexes.slice(),
      retriedQuestionIndexes: [...retriedQuestionIndexes]
    };
    updateLearningProgress();
    displayQuizResult(lastQuizResult);
  }

  function displayQuizResult(result){
    const { correctCount, wrongCount, percent } = result;

    document.getElementById('resultCorrect').textContent = correctCount;
    document.getElementById('resultWrong').textContent = wrongCount;
    document.getElementById('resultScore').textContent = percent;
    document.getElementById('resultPercent').textContent = percent + '%';
    document.getElementById('resultCompleted').textContent =
      (correctCount + wrongCount) + ' soal dikerjakan';
    document.querySelector('.result-score-ring').style.setProperty('--pct', percent);

    const resultTitle = document.getElementById('resultTitle');
    if (percent >= 80) resultTitle.textContent = 'Kerja Bagus! 🎉';
    else if (percent >= 60) resultTitle.textContent = 'Cukup Baik 👍';
    else resultTitle.textContent = 'Terus Berlatih 💪';

    const resultSummary = document.getElementById('resultSummary');
    const resultInsightTitle = document.getElementById('resultInsightTitle');
    const resultRecommendation = document.getElementById('resultRecommendation');
    if (percent >= 80) {
      resultTitle.textContent = 'Kerja Bagus!';
      resultSummary.textContent = 'Pemahamanmu terhadap materi sudah sangat baik.';
      resultInsightTitle.textContent = 'Pertahankan pemahamanmu';
      resultRecommendation.textContent = 'Buka pembahasan untuk memperkuat alasan di balik setiap jawaban.';
    } else if (percent >= 60) {
      resultTitle.textContent = 'Cukup Baik';
      resultSummary.textContent = 'Kamu sudah memahami sebagian besar materi.';
      resultInsightTitle.textContent = 'Ulangi bagian yang keliru';
      resultRecommendation.textContent = 'Gunakan tombol ulangi soal salah, lalu baca kembali materi yang masih perlu diperkuat.';
    } else {
      resultTitle.textContent = 'Terus Berlatih';
      resultSummary.textContent = 'Masih ada beberapa konsep yang perlu dipelajari kembali.';
      resultInsightTitle.textContent = 'Mulai dari materi dasar';
      resultRecommendation.textContent = 'Pelajari kembali pengertian, jenis, dan topologi jaringan sebelum mengulang kuis.';
    }
    document.getElementById('retryWrongBtn').style.display = lastWrongQuestionIndexes.length ? 'inline-flex' : 'none';

    showQuizSection('hasil');
  }

  function restoreQuizResult(){
    if (!lastQuizResult) return;
    reviewAnswers = Array.isArray(lastQuizResult.reviewAnswers) ? lastQuizResult.reviewAnswers : reviewAnswers;
    lastWrongQuestionIndexes = Array.isArray(lastQuizResult.lastWrongQuestionIndexes) ? lastQuizResult.lastWrongQuestionIndexes : [];
    retriedQuestionIndexes.clear();
    (lastQuizResult.retriedQuestionIndexes || []).forEach(index => retriedQuestionIndexes.add(index));
    displayQuizResult(lastQuizResult);
  }

  startQuizBtn.addEventListener('click', () => {
    startQuiz();
  });
  document.getElementById('retryQuizBtn').addEventListener('click', () => startQuiz());
  document.getElementById('retryWrongBtn').addEventListener('click', () => startQuiz(lastWrongQuestionIndexes));

  document.getElementById('showReviewBtn').addEventListener('click', () => {
    renderReview();
    showQuizSection('review');
  });
  document.getElementById('backToResultBtn').addEventListener('click', () => {
    showQuizSection('hasil');
  });

  function renderReview(){
    const reviewList = document.getElementById('reviewList');
    reviewList.innerHTML = '';
    const letters = ['A', 'B', 'C', 'D'];

    quizData.forEach((data, i) => {
      const userAns = reviewAnswers[i];
      const isCorrect = userAns === data.correct;
      const wasRetried = retriedQuestionIndexes.has(i);

      const item = document.createElement('div');
      item.className = 'review-item';
      item.innerHTML = `
        <span class="review-tag ${isCorrect ? 'correct' : 'wrong'}">${isCorrect ? 'Benar' : 'Salah'}</span>
        ${wasRetried ? '<span class="review-tag retried">Diulang</span>' : ''}
        <p class="review-q">${i + 1}. ${data.q}</p>
        <p><strong>Jawabanmu:</strong> ${userAns !== null ? letters[userAns] + '. ' + data.options[userAns] : '(tidak dijawab)'}</p>
        <p><strong>Jawaban benar:</strong> ${letters[data.correct]}. ${data.options[data.correct]}</p>
        <div class="review-explain">${data.explain}</div>
      `;
      reviewList.appendChild(item);
    });
  }

  try {
    const savedPage = localStorage.getItem(activePageStorageKey);
    if (new URLSearchParams(window.location.search).get('page') === 'kuis' || (savedPage === 'kuis' && lastQuizResult)) goToPage('kuis');
  } catch (error) {
    // Halaman tetap menggunakan dashboard bila penyimpanan browser tidak tersedia.
  }

});

/* Interaksi materi pada materi.html; progres disimpan oleh halaman utama. */
document.addEventListener('DOMContentLoaded', () => {
  if (!document.body.classList.contains('materi-body')) return;

  const topics = ['pengertian', 'jenis', 'topologi'];
  const completedChecks = new Set();
  const completedVideos = new Set();
  const materialPage = document.querySelector('.materi-page');
  const materiOverview = document.getElementById('materiOverview');
  const materiContent = document.getElementById('materiContent');
  const notifyParent = message => {
    if (window.parent !== window) window.parent.postMessage(message, '*');
  };
  function saveStandaloneProgress() {
    if (window.parent !== window) return;
    try {
      const key = 'jarkom-learning-progress';
      const saved = JSON.parse(localStorage.getItem(key) || '{}');
      saved.completedChecks = [...completedChecks];
      saved.completedVideos = [...completedVideos];
      localStorage.setItem(key, JSON.stringify(saved));
    } catch (error) { /* Materi tetap dapat digunakan tanpa penyimpanan browser. */ }
  }

  function showTopic(topic) {
    if (!topics.includes(topic)) return;
    if (materiOverview) materiOverview.hidden = true;
    if (materiContent) materiContent.hidden = false;
    document.querySelectorAll('.tab').forEach(tab => tab.classList.toggle('active', tab.dataset.topic === topic));
    document.querySelectorAll('.topic-panel').forEach(panel => panel.classList.toggle('active', panel.id === `topic-${topic}`));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    requestAnimationFrame(() => notifyParent({
      type: 'jarkom-materi-height',
      height: Math.ceil(materialPage.getBoundingClientRect().height + 28)
    }));
  }

  function showOverview() {
    if (materiOverview) materiOverview.hidden = false;
    if (materiContent) materiContent.hidden = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    requestAnimationFrame(() => notifyParent({
      type: 'jarkom-materi-height',
      height: Math.ceil(materialPage.getBoundingClientRect().height + 28)
    }));
  }

  function showCompletedChecks() {
    document.querySelectorAll('.check-box').forEach(box => {
      if (!completedChecks.has(box.dataset.check)) return;
      box.querySelectorAll('.opt-btn').forEach(button => {
        button.disabled = true;
        if (button.dataset.correct === 'true') button.classList.add('correct');
      });
      const feedback = box.querySelector('.check-feedback');
      if (!feedback.textContent) {
        feedback.textContent = 'Latihan singkat ini sudah selesai.';
        feedback.className = 'check-feedback correct';
      }
    });
  }

  function showCompletedVideos() {
    document.querySelectorAll('[data-video-status]').forEach(status => {
      const done = completedVideos.has(status.dataset.videoStatus);
      status.textContent = done ? 'Selesai ditonton' : 'Belum selesai';
      status.classList.toggle('done', done);
    });
    document.querySelectorAll('[data-video-note]').forEach(note => {
      if (completedVideos.has(note.dataset.videoNote)) note.textContent = '✓ Video selesai ditonton dan tercatat dalam progress belajar.';
    });
  }

  document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => showTopic(tab.dataset.topic)));
  document.querySelectorAll('[data-topic-goto]').forEach(button => button.addEventListener('click', () => showTopic(button.dataset.topicGoto)));
  document.querySelectorAll('[data-topic-select]').forEach(button => button.addEventListener('click', () => showTopic(button.dataset.topicSelect)));
  document.querySelectorAll('[data-show-overview]').forEach(button => button.addEventListener('click', showOverview));
  document.querySelectorAll('[data-goto="kuis"]').forEach(button => button.addEventListener('click', () => {
    if (window.parent !== window) notifyParent({ type: 'jarkom-materi-navigate', page: 'kuis' });
    else window.location.href = 'index.html?page=kuis';
  }));

  document.querySelectorAll('.check-box').forEach(box => {
    const options = [...box.querySelectorAll('.opt-btn')];
    options.forEach(option => option.addEventListener('click', () => {
      if (completedChecks.has(box.dataset.check)) return;
      const correct = option.dataset.correct === 'true';
      options.forEach(button => {
        button.disabled = true;
        if (button.dataset.correct === 'true') button.classList.add('correct');
      });
      if (!correct) option.classList.add('wrong');
      const feedback = box.querySelector('.check-feedback');
      feedback.textContent = correct ? '✓ Benar! Jawabanmu tepat.' : '✕ Kurang tepat. Jawaban yang benar sudah ditandai hijau di atas.';
      feedback.className = `check-feedback ${correct ? 'correct' : 'wrong'}`;
      completedChecks.add(box.dataset.check);
      notifyParent({ type: 'jarkom-materi-check', topic: box.dataset.check });
      saveStandaloneProgress();
    }));
  });

  document.querySelectorAll('.lesson-video-player').forEach(video => video.addEventListener('ended', () => {
    const topic = video.closest('[data-video-key]').dataset.videoKey;
    completedVideos.add(topic);
    showCompletedVideos();
    notifyParent({ type: 'jarkom-materi-video', topic });
    saveStandaloneProgress();
  }));

  window.addEventListener('message', event => {
    if (event.source !== window.parent || !event.data || typeof event.data !== 'object') return;
    const data = event.data;
    if (data.type === 'jarkom-materi-topic') showTopic(data.topic);
    if (data.type === 'jarkom-materi-progress') {
      (data.checks || []).filter(topic => topics.includes(topic)).forEach(topic => completedChecks.add(topic));
      (data.videos || []).filter(topic => topics.includes(topic)).forEach(topic => completedVideos.add(topic));
      showCompletedChecks();
      showCompletedVideos();
    }
  });

  if (window.parent === window) {
    try {
      const saved = JSON.parse(localStorage.getItem('jarkom-learning-progress') || '{}');
      (saved.completedChecks || []).forEach(topic => completedChecks.add(topic));
      (saved.completedVideos || []).forEach(topic => completedVideos.add(topic));
      showCompletedChecks();
      showCompletedVideos();
    } catch (error) { /* Materi tetap dapat dibuka tanpa penyimpanan browser. */ }
  } else {
    const reportHeight = () => notifyParent({
      type: 'jarkom-materi-height',
      height: Math.ceil(materialPage.getBoundingClientRect().height + 28)
    });
    new ResizeObserver(reportHeight).observe(materialPage);
    window.addEventListener('load', reportHeight);
    notifyParent({ type: 'jarkom-materi-ready' });
  }
});

/* Simulasi topologi pada simulasi.html */
document.addEventListener('DOMContentLoaded', () => {
  /* =======================================================
     5. SIMULASI TOPOLOGI JARINGAN
     ======================================================= */
  const topologySvg = document.getElementById('topologySvg');
  if (topologySvg) {
    const topologyDescription = document.getElementById('topologyDescription');
    const simulationTitle = document.getElementById('simulationTitle');
    const simulationStatus = document.getElementById('simulationStatus');
    const simulationCaption = document.getElementById('simulationCaption');
    const sendPacketBtn = document.getElementById('sendPacketBtn');
    const toggleFaultBtn = document.getElementById('toggleFaultBtn');
    const deviceTools = [...document.querySelectorAll('[data-add-device]')];
    const connectDevicesBtn = document.getElementById('connectDevicesBtn');
    const resetLayoutBtn = document.getElementById('resetLayoutBtn');
    const packetSource = document.getElementById('packetSource');
    const packetDestination = document.getElementById('packetDestination');
    const simulationStage = document.getElementById('simulationStage');
    const selectionLabel = document.getElementById('selectionLabel');
    const deleteSelectionBtn = document.getElementById('deleteSelectionBtn');
    const challengeQuestion = document.getElementById('challengeQuestion');
    const challengeFeedback = document.getElementById('challengeFeedback');
    const challengeProgress = document.getElementById('challengeProgress');
    const challengeList = document.getElementById('challengeList');
    let selectedTopology = 'star';
    let faultActive = false;
    let brokenLinkIndex = null;
    let isSelectingCable = false;
    let packetAnimation = null;
    let packetTimer = null;
    let draggedNode = null;
    let extraComputerCount = 0;
    let extraSwitchCount = 0;
    let extraRouterCount = 0;
    let activeTool = null;
    let cableStart = null;
    let selectedItem = null;
    let resetPacketEndpoints = false;

    const topologyData = {
      star: {
        name: 'Topologi Star', description: 'Semua komputer terhubung ke satu perangkat pusat, seperti switch.',
        caption: 'Pada topologi Star, paket data dari Komputer A diteruskan switch menuju Komputer C.',
        svgTitle: 'Visualisasi topologi star', svgDesc: 'Empat komputer terhubung ke switch di bagian tengah.',
        nodes: [{ id:'a', label:'Komputer A', x:105, y:85 }, { id:'b', label:'Komputer B', x:555, y:85 }, { id:'c', label:'Komputer C', x:555, y:305 }, { id:'d', label:'Komputer D', x:105, y:305 }, { id:'s', label:'Switch', x:330, y:195, center:true }],
        links: [['a','s'],['b','s'],['c','s'],['d','s']], route:['a','s','c']
      },
      bus: {
        name: 'Topologi Bus', description: 'Semua komputer berbagi satu kabel utama atau backbone.',
        caption: 'Pada topologi Bus, paket data dari Komputer A berjalan melalui backbone menuju Komputer C.',
        svgTitle: 'Visualisasi topologi bus', svgDesc: 'Empat komputer terhubung pada satu kabel utama.',
        nodes: [{ id:'a', label:'Komputer A', x:115, y:90 }, { id:'b', label:'Komputer B', x:275, y:90 }, { id:'c', label:'Komputer C', x:435, y:90 }, { id:'d', label:'Komputer D', x:545, y:90 }],
        links: [['line1','line2'],['a','lineA'],['b','lineB'],['c','lineC'],['d','lineD']], route:['a','lineA','lineC','c'],
        virtual: { line1:{x:65,y:245}, line2:{x:595,y:245}, lineA:{x:115,y:245}, lineB:{x:275,y:245}, lineC:{x:435,y:245}, lineD:{x:545,y:245} }
      },
      ring: {
        name: 'Topologi Ring', description: 'Setiap komputer tersambung membentuk jalur melingkar atau loop tertutup.',
        caption: 'Pada topologi Ring, paket data dari Komputer A bergerak mengikuti loop menuju Komputer C.',
        svgTitle: 'Visualisasi topologi ring', svgDesc: 'Empat komputer tersambung membentuk loop tertutup.',
        nodes: [{ id:'a', label:'Komputer A', x:180, y:90 }, { id:'b', label:'Komputer B', x:480, y:90 }, { id:'c', label:'Komputer C', x:480, y:300 }, { id:'d', label:'Komputer D', x:180, y:300 }],
        links: [['a','b'],['b','c'],['c','d'],['d','a']], route:['a','b','c']
      },
      mesh: {
        name: 'Topologi Mesh', description: 'Setiap komputer memiliki jalur langsung ke komputer lain sehingga tersedia banyak rute komunikasi.',
        caption: 'Pada topologi Mesh, paket dapat menempuh koneksi langsung antarkomputer.',
        svgTitle: 'Visualisasi topologi mesh', svgDesc: 'Empat komputer saling terhubung satu sama lain.',
        nodes: [{ id:'a', label:'Komputer A', x:170, y:88 }, { id:'b', label:'Komputer B', x:490, y:88 }, { id:'c', label:'Komputer C', x:490, y:302 }, { id:'d', label:'Komputer D', x:170, y:302 }],
        links: [['a','b'],['a','c'],['a','d'],['b','c'],['b','d'],['c','d']]
      },
      tree: {
        name: 'Topologi Tree', description: 'Perangkat disusun secara bertingkat dari perangkat pusat menuju cabang-cabang jaringan.',
        caption: 'Pada topologi Tree, paket bergerak melalui perangkat induk dan cabang yang sesuai.',
        svgTitle: 'Visualisasi topologi tree', svgDesc: 'Jaringan bertingkat dengan switch pusat dan dua cabang.',
        nodes: [{ id:'root', label:'Switch Utama', x:330, y:65, center:true }, { id:'left', label:'Switch 1', x:205, y:180, center:true }, { id:'right', label:'Switch 2', x:455, y:180, center:true }, { id:'a', label:'Komputer A', x:110, y:310 }, { id:'b', label:'Komputer B', x:250, y:310 }, { id:'c', label:'Komputer C', x:410, y:310 }, { id:'d', label:'Komputer D', x:550, y:310 }],
        links: [['root','left'],['root','right'],['left','a'],['left','b'],['right','c'],['right','d']]
      },
      hybrid: {
        name: 'Topologi Hybrid', description: 'Menggabungkan dua pola jaringan; pada simulasi ini dua jaringan Star disambungkan satu sama lain.',
        caption: 'Pada topologi Hybrid, paket dapat menyeberang dari satu kelompok Star ke kelompok lainnya.',
        svgTitle: 'Visualisasi topologi hybrid', svgDesc: 'Dua topologi star yang dihubungkan oleh kabel antar switch.',
        nodes: [{ id:'left', label:'Switch 1', x:225, y:195, center:true }, { id:'right', label:'Switch 2', x:435, y:195, center:true }, { id:'a', label:'Komputer A', x:100, y:85 }, { id:'b', label:'Komputer B', x:100, y:305 }, { id:'c', label:'Komputer C', x:560, y:85 }, { id:'d', label:'Komputer D', x:560, y:305 }],
        links: [['a','left'],['b','left'],['left','right'],['c','right'],['d','right']]
      }
    };
    const initialTopologyData = JSON.parse(JSON.stringify(topologyData));
    const topologyChallenges = {
      star: { source: 'a', destinationLabel: 'Komputer G', requiredLinkTo: 's', requiredLinkEndpoint: 'destination', prompt: 'Tambahkan Komputer E, F, dan G. Hubungkan Komputer G ke switch, lalu kirim paket dari Komputer A ke Komputer G.' },
      bus: { source: 'b', destination: 'd', requiresFailure: true, prompt: 'Putuskan kabel backbone (kabel horizontal utama), lalu coba kirim paket dari Komputer B ke Komputer D untuk membuktikan paket gagal lewat.' },
      ring: { source: 'd', destination: 'b', prompt: 'Kirim paket dari Komputer D ke Komputer B mengikuti jalur ring.' },
      mesh: { source: 'a', destination: 'd', prompt: 'Kirim paket dari Komputer A ke Komputer D melalui koneksi yang tersedia.' },
      tree: { sourceLabel: 'Komputer E', destination: 'c', requiredLinkTo: 'left', prompt: 'Tambahkan Komputer E, hubungkan ke Switch 1, lalu kirim paket dari Komputer E ke Komputer C.' },
      hybrid: { source: 'b', destination: 'c', prompt: 'Kirim paket dari Komputer B ke Komputer C dengan melewati dua jaringan star.' }
    };
    const completedChallenges = new Set();

    function getPoint(id, data) {
      return data.nodes.find(node => node.id === id) || data.virtual?.[id];
    }
    function updateEndpointOptions() {
      const data = topologyData[selectedTopology];
      const previousSource = resetPacketEndpoints ? '' : packetSource.value;
      const previousDestination = resetPacketEndpoints ? '' : packetDestination.value;
      const options = '<option value="" disabled>-- Pilih komputer --</option>' + data.nodes.map(node => `<option value="${node.id}">${node.label}</option>`).join('');
      packetSource.innerHTML = options; packetDestination.innerHTML = options;
      packetSource.value = data.nodes.some(node => node.id === previousSource) ? previousSource : '';
      packetDestination.value = data.nodes.some(node => node.id === previousDestination) ? previousDestination : '';
      sendPacketBtn.disabled = data.nodes.length < 2 || !packetSource.value || !packetDestination.value;
      resetPacketEndpoints = false;
    }
    function renderChallenge() {
      const challenge = topologyChallenges[selectedTopology];
      if (!challengeQuestion || !challengeFeedback || !challengeProgress || !challengeList || !challenge) return;
      const completed = completedChallenges.has(selectedTopology);
      challengeQuestion.textContent = `${topologyData[selectedTopology].name}: ${challenge.prompt}`;
      challengeProgress.textContent = `${completedChallenges.size}/${Object.keys(topologyChallenges).length} selesai`;
      challengeFeedback.textContent = completed
        ? 'Misi topologi ini sudah selesai. Anda boleh mencoba rute lain atau lanjut ke topologi berikutnya.'
        : 'Atur asal dan tujuan sesuai misi, kemudian tekan Kirim Paket Data.';
      challengeFeedback.className = `challenge-feedback${completed ? ' success' : ''}`;
      challengeList.innerHTML = Object.keys(topologyChallenges).map(key => `<div class="challenge-item ${key === selectedTopology ? 'active' : ''} ${completedChallenges.has(key) ? 'done' : ''}">${topologyData[key].name.replace('Topologi ', '')}</div>`).join('');
    }
    function challengeDeviceId(challenge, endpoint, data) {
      const id = challenge[endpoint];
      if (id) return id;
      const label = challenge[`${endpoint}Label`];
      return data.nodes.find(node => node.label === label)?.id || '';
    }
    function completeChallenge(source, destination, failed = false) {
      const challenge = topologyChallenges[selectedTopology];
      const data = topologyData[selectedTopology];
      const requiredSource = challengeDeviceId(challenge, 'source', data);
      const requiredDestination = challengeDeviceId(challenge, 'destination', data);
      const cableDevice = challengeDeviceId(challenge, challenge.requiredLinkEndpoint || 'source', data);
      const hasRequiredCable = !challenge.requiredLinkTo || data.links.some(([from, to]) =>
        (from === cableDevice && to === challenge.requiredLinkTo) || (to === cableDevice && from === challenge.requiredLinkTo)
      );
      if (!challenge || requiredSource !== source || requiredDestination !== destination || failed !== Boolean(challenge.requiresFailure) || !hasRequiredCable) {
        challengeFeedback.textContent = 'Aksi simulasi belum memenuhi semua syarat misi. Periksa kembali instruksinya.';
        challengeFeedback.className = 'challenge-feedback warning';
        return;
      }
      completedChallenges.add(selectedTopology);
      renderChallenge();
      challengeFeedback.textContent = completedChallenges.size === Object.keys(topologyChallenges).length
        ? 'Hebat! Semua misi topologi telah selesai.'
        : '✓ Misi selesai otomatis! Lanjutkan ke topologi berikutnya.';
      challengeFeedback.className = 'challenge-feedback success';
    }
    function getPacketRoute(data, source, destination) {
      const neighbours = new Map();
      const connect = (from, to) => {
        neighbours.set(from, [...(neighbours.get(from) || []), to]);
        neighbours.set(to, [...(neighbours.get(to) || []), from]);
      };
      data.links.forEach(([from, to]) => connect(from, to));
      if (selectedTopology === 'bus') {
        Object.keys(data.virtual).filter(id => id !== 'line1' && id !== 'line2').forEach(id => connect(id, 'line1'));
      }
      const queue = [[source]];
      const visited = new Set([source]);
      while (queue.length) {
        const route = queue.shift();
        const last = route[route.length - 1];
        if (last === destination) return route;
        (neighbours.get(last) || []).forEach(next => {
          if (!visited.has(next)) { visited.add(next); queue.push([...route, next]); }
        });
      }
      return [];
    }
    function nodeMarkup(node) {
      const type = node.type || (node.center ? 'switch' : 'computer');
      const icon = type === 'computer'
        ? '<rect class="node-screen" x="-27" y="-21" width="54" height="34" rx="4"/><path class="device-detail" d="M-12 21h24M0 13v8"/>'
        : type === 'router'
          ? '<ellipse class="router-top" cx="0" cy="-10" rx="31" ry="12"/><path class="router-side" d="M-31 -10v16c0 7 14 12 31 12S31 13 31 6v-16"/><path class="device-detail" d="M-17 2l10-5m-7 11L-4 3M17 2 7-3m7 11L4 3"/>'
          : '<rect class="switch-case" x="-34" y="-17" width="68" height="32" rx="6"/><path class="device-detail" d="M-22 -6h8m5 0h8m5 0h8m-34 10h8m5 0h8m5 0h8"/>';
      return `<g class="topology-node ${type} draggable" data-node-id="${node.id}" tabindex="0" role="button" aria-label="${node.label}. Tarik untuk memindahkan atau pilih untuk menghubungkan kabel." transform="translate(${node.x} ${node.y})"><circle class="node-halo" r="40"/>${icon}<text y="46">${node.label}</text></g>`;
    }
    function selectItem(kind, value) {
      selectedItem = kind ? { kind, value } : null;
      topologySvg.querySelectorAll('.topology-node, .topology-link').forEach(element => element.classList.remove('selected'));
      if (selectedItem?.kind === 'node') {
        topologySvg.querySelector(`[data-node-id="${value}"]`)?.classList.add('selected');
      } else if (selectedItem?.kind === 'link') {
        topologySvg.querySelector(`[data-link-index="${value}"]`)?.classList.add('selected');
      }
      const data = topologyData[selectedTopology];
      selectionLabel.textContent = selectedItem?.kind === 'node'
        ? `Dipilih: ${data.nodes.find(node => node.id === value)?.label || 'Perangkat'}`
        : selectedItem?.kind === 'link' ? `Dipilih: Kabel ${Number(value) + 1}` : 'Belum ada objek dipilih';
      deleteSelectionBtn.disabled = !selectedItem;
    }
    function deleteSelection() {
      if (!selectedItem) return;
      const data = topologyData[selectedTopology];
      if (selectedItem.kind === 'node') {
        const id = selectedItem.value;
        data.nodes = data.nodes.filter(node => node.id !== id);
        data.links = data.links.filter(([from, to]) => from !== id && to !== id);
        if (data.virtual) delete data.virtual[`line${id}`];
        simulationStatus.textContent = 'Perangkat dihapus';
      } else {
        data.links.splice(selectedItem.value, 1);
        simulationStatus.textContent = 'Kabel dihapus';
      }
      faultActive = false; brokenLinkIndex = null; isSelectingCable = false; cableStart = null;
      toggleFaultBtn.textContent = 'Pilih Kabel untuk Diputus';
      toggleFaultBtn.setAttribute('aria-pressed', 'false');
      selectedItem = null;
      renderTopology();
      selectItem(null);
      simulationStatus.textContent = 'Objek berhasil dihapus';
      simulationStatus.className = 'simulation-status success';
      simulationCaption.textContent = 'Pilih perangkat atau kabel lain untuk menghapusnya, atau seret perangkat baru ke arena.';
    }
    function setActiveTool(tool) {
      activeTool = activeTool === tool ? null : tool;
      cableStart = null;
      if (activeTool && isSelectingCable) {
        isSelectingCable = false;
        toggleFaultBtn.textContent = 'Pilih Kabel untuk Diputus';
        toggleFaultBtn.setAttribute('aria-pressed', 'false');
        topologySvg.querySelectorAll('.topology-link').forEach(link => link.classList.remove('selectable'));
      }
      deviceTools.forEach(button => {
        const active = activeTool === button.dataset.addDevice;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      connectDevicesBtn.classList.toggle('active', activeTool === 'cable');
      connectDevicesBtn.setAttribute('aria-pressed', String(activeTool === 'cable'));
      topologySvg.classList.toggle('placing-device', !!activeTool && activeTool !== 'cable');
      topologySvg.classList.toggle('connecting-device', activeTool === 'cable');
      topologySvg.querySelectorAll('.topology-node').forEach(node => node.classList.remove('cable-start'));
      simulationCaption.textContent = activeTool === 'cable'
        ? 'Klik perangkat pertama, lalu klik perangkat kedua untuk memasang kabel.'
        : activeTool ? 'Klik area kosong pada diagram untuk menempatkan perangkat.' : topologyData[selectedTopology].caption;
    }
    function handleNodeConnection(id) {
      if (activeTool !== 'cable') return;
      if (!cableStart) {
        cableStart = id;
        topologySvg.querySelector(`[data-node-id="${id}"]`)?.classList.add('cable-start');
        simulationStatus.textContent = 'Pilih perangkat kedua';
        return;
      }
      if (cableStart === id) return;
      const data = topologyData[selectedTopology];
      const alreadyConnected = data.links.some(([a, b]) => (a === cableStart && b === id) || (a === id && b === cableStart));
      const fromLabel = data.nodes.find(node => node.id === cableStart)?.label;
      const toLabel = data.nodes.find(node => node.id === id)?.label;
      if (!alreadyConnected) data.links.push([cableStart, id]);
      cableStart = null;
      renderTopology();
      simulationStatus.textContent = alreadyConnected ? 'Perangkat sudah terhubung' : 'Kabel terpasang';
      simulationStatus.className = 'simulation-status ' + (alreadyConnected ? 'warning' : 'success');
      simulationCaption.textContent = alreadyConnected ? `${fromLabel} dan ${toLabel} sudah terhubung.` : `${fromLabel} terhubung ke ${toLabel}. Klik dua perangkat lain untuk menambah kabel.`;
    }
    function attachDragHandlers() {
      topologySvg.querySelectorAll('.topology-node.draggable').forEach(node => {
        node.addEventListener('keydown', event => {
          if (activeTool === 'cable' && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            handleNodeConnection(node.dataset.nodeId);
          } else if (!activeTool && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            selectItem('node', node.dataset.nodeId);
          }
        });
        node.addEventListener('pointerdown', event => {
          if (activeTool === 'cable') {
            handleNodeConnection(node.dataset.nodeId);
            event.preventDefault();
            return;
          }
          if (activeTool) setActiveTool(activeTool);
          selectItem('node', node.dataset.nodeId);
          draggedNode = node.dataset.nodeId;
          topologySvg.setPointerCapture?.(event.pointerId);
          node.classList.add('is-dragging');
          simulationStatus.textContent = 'Atur posisi perangkat';
          simulationStatus.className = 'simulation-status';
          event.preventDefault();
        });
      });
    }
    function attachCableHandlers() {
      topologySvg.querySelectorAll('.topology-link').forEach(link => {
        link.addEventListener('click', () => {
          if (!isSelectingCable) {
            if (!activeTool) selectItem('link', Number(link.dataset.linkIndex));
            return;
          }
          brokenLinkIndex = Number(link.dataset.linkIndex);
          faultActive = true;
          isSelectingCable = false;
          toggleFaultBtn.textContent = 'Pulihkan Koneksi Kabel';
          toggleFaultBtn.setAttribute('aria-pressed', 'true');
          renderTopology();
          simulationStatus.textContent = 'Kabel terputus dipilih';
          simulationStatus.className = 'simulation-status warning';
          simulationCaption.textContent = 'Kabel merah sedang putus. Kirim paket untuk melihat apakah rute tersebut terdampak.';
        });
      });
    }
    function moveDraggedNode(event) {
      if (!draggedNode) return;
      const { x, y } = pointOnCanvas(event);
      const data = topologyData[selectedTopology];
      const node = data.nodes.find(item => item.id === draggedNode);
      if (!node) return;
      node.x = Math.round(x); node.y = Math.round(y);
      if (selectedTopology === 'bus' && data.virtual['line' + node.id]) data.virtual['line' + node.id].x = node.x;
      updateSvgPositions(data);
    }
    function pointOnCanvas(event) {
      const point = topologySvg.createSVGPoint();
      point.x = event.clientX; point.y = event.clientY;
      const local = point.matrixTransform(topologySvg.getScreenCTM().inverse());
      return { x: Math.round(Math.max(55, Math.min(605, local.x))), y: Math.round(Math.max(55, Math.min(335, local.y))) };
    }
    function updateSvgPositions(data) {
      data.nodes.forEach(node => {
        const element = topologySvg.querySelector(`[data-node-id="${node.id}"]`);
        if (element) element.setAttribute('transform', `translate(${node.x} ${node.y})`);
      });
      data.links.forEach((link, index) => {
        const line = topologySvg.querySelector(`[data-link-index="${index}"]`);
        const from = getPoint(link[0], data); const to = getPoint(link[1], data);
        if (line && from && to) { line.setAttribute('x1', from.x); line.setAttribute('y1', from.y); line.setAttribute('x2', to.x); line.setAttribute('y2', to.y); }
      });
    }
    function addDevice(type, position) {
      const data = topologyData[selectedTopology];
      if (data.nodes.length >= 16) {
        simulationStatus.textContent = 'Maksimal 16 perangkat'; simulationStatus.className = 'simulation-status warning';
        return;
      }
      const count = type === 'computer' ? ++extraComputerCount : type === 'switch' ? ++extraSwitchCount : ++extraRouterCount;
      const id = `${type}${count}`;
      const usedLabels = new Set(data.nodes.map(node => node.label));
      let number = 1;
      const makeLabel = index => type === 'computer' ? `Komputer ${String.fromCharCode(64 + index)}` : `${type === 'switch' ? 'Switch' : 'Router'} ${index}`;
      while (usedLabels.has(makeLabel(number))) number += 1;
      const label = makeLabel(number);
      data.nodes.push({ id, label, type, x:position.x, y:position.y });
      faultActive = false; brokenLinkIndex = null; isSelectingCable = false; toggleFaultBtn.textContent = 'Pilih Kabel untuk Diputus'; toggleFaultBtn.setAttribute('aria-pressed', 'false');
      renderTopology();
      selectItem('node', id);
      simulationStatus.textContent = `${label} ditambahkan`; simulationStatus.className = 'simulation-status success';
      simulationCaption.textContent = `${label} dipilih. Klik ruang kosong untuk memindahkannya, atau pilih Hubungkan Kabel untuk menyambungnya.`;
    }
    function resetLayout() {
      Object.keys(topologyData).forEach(key => { topologyData[key] = JSON.parse(JSON.stringify(initialTopologyData[key])); });
      extraComputerCount = 0; extraSwitchCount = 0; extraRouterCount = 0; faultActive = false; brokenLinkIndex = null; isSelectingCable = false; draggedNode = null;
      activeTool = null; cableStart = null; selectedItem = null;
      toggleFaultBtn.textContent = 'Pilih Kabel untuk Diputus'; toggleFaultBtn.setAttribute('aria-pressed', 'false');
      renderTopology();
      setActiveTool(null);
      selectItem(null);
      simulationStatus.textContent = 'Tata letak dipulihkan'; simulationStatus.className = 'simulation-status success';
    }
    function stopPacketAnimation() {
      if (packetAnimation !== null) cancelAnimationFrame(packetAnimation);
      if (packetTimer !== null) clearTimeout(packetTimer);
      packetAnimation = null;
      packetTimer = null;
    }
    function renderTopology() {
      const data = topologyData[selectedTopology];
      stopPacketAnimation();
      const links = data.links.map((link, index) => {
        const from = getPoint(link[0], data); const to = getPoint(link[1], data);
        return `<line class="topology-link ${faultActive && brokenLinkIndex === index ? 'broken' : ''} ${isSelectingCable ? 'selectable' : ''}" data-link-index="${index}" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"/>`;
      }).join('');
      const terminators = selectedTopology === 'bus' ? '<circle cx="55" cy="245" r="8" fill="#1B4B7A"/><circle cx="605" cy="245" r="8" fill="#1B4B7A"/><text x="55" y="274" text-anchor="middle" fill="#5B6B7F" font-size="11">Terminator</text><text x="605" y="274" text-anchor="middle" fill="#5B6B7F" font-size="11">Terminator</text>' : '';
      topologySvg.innerHTML = `<title id="simulationSvgTitle">${data.svgTitle}</title><desc id="simulationSvgDesc">${data.svgDesc}</desc>${links}${terminators}${data.nodes.map(nodeMarkup).join('')}`;
      topologyDescription.innerHTML = `<h2>${data.name}</h2><p>${data.description}</p>`;
      simulationTitle.textContent = data.name;
      simulationCaption.textContent = isSelectingCable ? 'Mode pilih kabel aktif: klik salah satu kabel biru pada diagram untuk memutuskannya.' : (faultActive ? 'Gangguan aktif: kabel berwarna merah putus sehingga paket data tidak dapat melewati jalur tersebut.' : data.caption);
      simulationStatus.textContent = isSelectingCable ? 'Pilih kabel pada diagram' : (faultActive ? 'Gangguan kabel aktif' : 'Siap mengirim data');
      simulationStatus.className = 'simulation-status' + (faultActive ? ' warning' : '');
      attachDragHandlers();
      attachCableHandlers();
      updateEndpointOptions();
      renderChallenge();
      topologySvg.querySelector(`[data-node-id="${cableStart}"]`)?.classList.add('cable-start');
      if (selectedItem) selectItem(selectedItem.kind, selectedItem.value);
    }
    function sendPacket() {
      const data = topologyData[selectedTopology];
      const source = packetSource.value; const destination = packetDestination.value;
      const sourceDevice = getPoint(source, data); const destinationDevice = getPoint(destination, data);
      if (!sourceDevice || !destinationDevice) {
        simulationStatus.textContent = 'Pilih asal dan tujuan paket'; simulationStatus.className = 'simulation-status warning';
        simulationCaption.textContent = 'Pilih dua perangkat pada daftar pengiriman, lalu tekan tombol Kirim Paket Data.';
        return;
      }
      if (source === destination) {
        simulationStatus.textContent = 'Pilih perangkat tujuan lain'; simulationStatus.className = 'simulation-status warning';
        return;
      }
      const sourceLabel = sourceDevice.label; const destinationLabel = destinationDevice.label;
      const routeIds = getPacketRoute(data, source, destination);
      if (routeIds.length < 2) {
        simulationStatus.textContent = 'Belum ada jalur kabel';
        simulationStatus.className = 'simulation-status warning';
        simulationCaption.textContent = `Hubungkan ${sourceLabel} dan ${destinationLabel} melalui alat kabel sebelum mengirim paket.`;
        return;
      }
      const brokenLink = data.links[brokenLinkIndex];
      const crossesBrokenLink = selectedTopology === 'bus' && brokenLinkIndex === 0 && routeIds.includes('line1') ? true : routeIds.some((id, index) => index > 0 && ((routeIds[index - 1] === brokenLink?.[0] && id === brokenLink?.[1]) || (routeIds[index - 1] === brokenLink?.[1] && id === brokenLink?.[0])));
      if (faultActive && crossesBrokenLink) {
        simulationStatus.textContent = 'Paket gagal: kabel putus';
        simulationStatus.className = 'simulation-status warning';
        simulationCaption.textContent = `Paket dari ${sourceLabel} ke ${destinationLabel} terhenti karena melewati kabel yang putus.`;
        completeChallenge(source, destination, true);
        return;
      }
      const route = routeIds.map(id => getPoint(id, data));
      if (route.some(point => !point)) {
        simulationStatus.textContent = 'Jalur paket tidak ditemukan';
        simulationStatus.className = 'simulation-status warning';
        simulationCaption.textContent = 'Terjadi kesalahan pada jalur simulasi. Pilih ulang topologi atau atur ulang posisi perangkat.';
        return;
      }
      stopPacketAnimation();
      topologySvg.querySelectorAll('.packet').forEach(existingPacket => existingPacket.remove());
      const packet = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      packet.setAttribute('class', 'packet running'); packet.setAttribute('r', '10');
      // Posisi awal dipasang segera supaya paket tidak tertahan di koordinat bawaan SVG (0, 0).
      packet.setAttribute('cx', route[0].x);
      packet.setAttribute('cy', route[0].y);
      topologySvg.appendChild(packet);
      const start = performance.now(); const duration = 1700;
      simulationStatus.textContent = `Mengirim ${sourceLabel} → ${destinationLabel}`; simulationStatus.className = 'simulation-status';
      function animate(now) {
        const progress = Math.min((now - start) / duration, 1);
        const scaled = progress * (route.length - 1);
        const segment = Math.min(Math.floor(scaled), route.length - 2);
        const portion = scaled - segment;
        const from = route[segment]; const to = route[segment + 1];
        packet.setAttribute('cx', from.x + ((to.x - from.x) * portion));
        packet.setAttribute('cy', from.y + ((to.y - from.y) * portion));
        if (progress < 1) {
          // Timer lebih andal untuk iframe yang menunda requestAnimationFrame.
          packetTimer = window.setTimeout(() => animate(performance.now()), 16);
        } else {
          packetTimer = null;
          packet.classList.remove('running'); simulationStatus.textContent = 'Paket berhasil diterima'; simulationStatus.className = 'simulation-status success'; simulationCaption.textContent = `Paket data berhasil dikirim dari ${sourceLabel} ke ${destinationLabel}.`; completeChallenge(source, destination);
        }
      }
      packetTimer = window.setTimeout(() => animate(performance.now()), 16);
    }
    document.querySelectorAll('.topology-option').forEach(button => button.addEventListener('click', () => {
      selectedTopology = button.dataset.topology; faultActive = false; brokenLinkIndex = null; isSelectingCable = false;
      activeTool = null; cableStart = null; selectedItem = null;
      resetPacketEndpoints = true;
      toggleFaultBtn.textContent = 'Pilih Kabel untuk Diputus'; toggleFaultBtn.setAttribute('aria-pressed', 'false');
      document.querySelectorAll('.topology-option').forEach(option => option.classList.toggle('active', option === button));
      renderTopology();
      renderChallenge();
      setActiveTool(null);
      selectItem(null);
    }));
    sendPacketBtn.addEventListener('click', sendPacket);
    [packetSource, packetDestination].forEach(select => select.addEventListener('change', () => {
      const data = topologyData[selectedTopology];
      const from = getPoint(packetSource.value, data); const to = getPoint(packetDestination.value, data);
      sendPacketBtn.disabled = !from || !to;
      simulationCaption.textContent = from && to
        ? `Siap mengirim paket dari ${from.label} ke ${to.label}.`
        : 'Pilih komputer asal dan tujuan untuk mengirim paket.';
    }));
    deviceTools.forEach(button => {
      button.addEventListener('click', () => setActiveTool(button.dataset.addDevice));
      button.addEventListener('dragstart', event => {
        event.dataTransfer.setData('text/plain', button.dataset.addDevice);
        event.dataTransfer.effectAllowed = 'copy';
        simulationStage.classList.add('drop-ready');
      });
      button.addEventListener('dragend', () => simulationStage.classList.remove('drop-ready'));
    });
    simulationStage.addEventListener('dragover', event => {
      if (!event.dataTransfer.types.includes('text/plain')) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      simulationStage.classList.add('drop-ready');
    });
    simulationStage.addEventListener('dragleave', event => {
      if (!simulationStage.contains(event.relatedTarget)) simulationStage.classList.remove('drop-ready');
    });
    simulationStage.addEventListener('drop', event => {
      const type = event.dataTransfer.getData('text/plain');
      if (!['computer', 'switch', 'router'].includes(type)) return;
      event.preventDefault();
      simulationStage.classList.remove('drop-ready');
      activeTool = null;
      setActiveTool(null);
      addDevice(type, pointOnCanvas(event));
    });
    connectDevicesBtn.addEventListener('click', () => setActiveTool('cable'));
    topologySvg.addEventListener('pointerdown', event => {
      if (!activeTool) {
        if (!event.target.closest('.topology-node, .topology-link')) {
          if (selectedItem?.kind === 'node') {
            const node = topologyData[selectedTopology].nodes.find(item => item.id === selectedItem.value);
            if (node) {
              const position = pointOnCanvas(event);
              node.x = position.x; node.y = position.y;
              const virtual = topologyData[selectedTopology].virtual;
              if (virtual?.[`line${node.id}`]) virtual[`line${node.id}`].x = node.x;
              updateSvgPositions(topologyData[selectedTopology]);
              simulationStatus.textContent = `${node.label} dipindahkan`;
              simulationStatus.className = 'simulation-status success';
              simulationCaption.textContent = `${node.label} dipindahkan. Klik ruang kosong lagi atau seret untuk mengatur posisinya.`;
            }
          } else selectItem(null);
        }
        return;
      }
      if (activeTool === 'cable' || event.target.closest('.topology-node')) return;
      const type = activeTool;
      setActiveTool(activeTool);
      addDevice(type, pointOnCanvas(event));
      event.preventDefault();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        if (activeTool) setActiveTool(activeTool);
        else selectItem(null);
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedItem && !(event.target instanceof Element && event.target.closest('input, select, textarea, [contenteditable]'))) {
        event.preventDefault();
        deleteSelection();
      }
    });
    deleteSelectionBtn.addEventListener('click', deleteSelection);
    resetLayoutBtn.addEventListener('click', resetLayout);
    topologySvg.addEventListener('pointermove', moveDraggedNode);
    topologySvg.addEventListener('pointerup', () => { draggedNode = null; });
    topologySvg.addEventListener('pointercancel', () => { draggedNode = null; });
    window.addEventListener('pointerup', () => { draggedNode = null; });
    toggleFaultBtn.addEventListener('click', () => {
      if (activeTool) setActiveTool(null);
      if (faultActive) {
        faultActive = false; brokenLinkIndex = null;
        toggleFaultBtn.textContent = 'Pilih Kabel untuk Diputus'; toggleFaultBtn.setAttribute('aria-pressed', 'false');
      } else {
        isSelectingCable = !isSelectingCable;
        toggleFaultBtn.textContent = isSelectingCable ? 'Batal Pilih Kabel' : 'Pilih Kabel untuk Diputus';
        toggleFaultBtn.setAttribute('aria-pressed', String(isSelectingCable));
      }
      renderTopology();
    });
    renderTopology();
  }

  if (topologySvg && window.parent !== window) {
    const reportHeight = () => window.parent.postMessage({ type: 'jarkom-simulation-height', height: document.documentElement.scrollHeight }, '*');
    new ResizeObserver(reportHeight).observe(document.querySelector('.simulation-page'));
    window.addEventListener('load', reportHeight);
  }

});
