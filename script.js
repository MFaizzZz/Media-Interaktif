/* =========================================================
   Media Pembelajaran Interaktif — Pengenalan Jaringan Komputer
   script.js
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

  /* =======================================================
     1. NAVIGASI NAVBAR (SPA - tanpa reload halaman)
     ======================================================= */
  const navItems = document.querySelectorAll('.nav-item');
  const pages = document.querySelectorAll('.page');
  const topbarPage = document.getElementById('topbarPage');
  const navbar = document.getElementById('navbar');
  const navToggle = document.querySelector('.nav-toggle');
  const activePageStorageKey = 'jarkom-active-page';

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
      feedback.textContent = 'Cek pemahaman ini sudah selesai.';
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
     5. KUIS EVALUASI (15 soal)
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
        : 'Selesaikan cek pemahaman pada 3 materi untuk membuka kuis.';
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
    if (savedPage === 'kuis' && lastQuizResult) goToPage('kuis');
  } catch (error) {
    // Halaman tetap menggunakan dashboard bila penyimpanan browser tidak tersedia.
  }

});
