
const App = {
  state: {
    currentView: 'landing',
    role: null,
    studentProfile: null, // { firstName, lastName, studentId }
    quizzes: [],
    submissions: [],
    editingQuizId: null,
    takingQuizId: null,
    currentResult: null,
    builderQuestions: [] // Temporary array while building a quiz
  },

  codes: {
    user: '362026',
    admin: '23133'
  }
};

const Storage = {
  KEYS: {
    quizzes: 'wms_quizmaker_quizzes',
    submissions: 'wms_quizmaker_submissions',
    profile: 'wms_quizmaker_profile',
    session: 'wms_quizmaker_session'
  },

  load() {
    try {
      const qRaw = localStorage.getItem(this.KEYS.quizzes);
      const sRaw = localStorage.getItem(this.KEYS.submissions);
      const pRaw = localStorage.getItem(this.KEYS.profile);
      App.state.quizzes = qRaw ? JSON.parse(qRaw) : [];
      App.state.submissions = sRaw ? JSON.parse(sRaw) : [];
      App.state.studentProfile = pRaw ? JSON.parse(pRaw) : null;

      let persistedRole = null;
      const sessRaw = localStorage.getItem(this.KEYS.session);
      if (sessRaw) {
        try {
          const sess = JSON.parse(sessRaw);
          if (sess && (sess.role === 'admin' || sess.role === 'user')) {
            persistedRole = sess.role;
          }
        } catch (err) {
          localStorage.removeItem(this.KEYS.session);
        }
      }
      if (persistedRole === 'user' && !App.state.studentProfile) {
        localStorage.removeItem(this.KEYS.session);
        persistedRole = null;
      }
      App.state.role = persistedRole;
      migrateQuizzes();
    } catch (e) {
      App.state.quizzes = [];
      App.state.submissions = [];
      App.state.studentProfile = null;
      App.state.role = null;
    }
  },

  save() {
    try {
      localStorage.setItem(this.KEYS.quizzes, JSON.stringify(App.state.quizzes));
      localStorage.setItem(this.KEYS.submissions, JSON.stringify(App.state.submissions));
      if (App.state.studentProfile) {
        localStorage.setItem(this.KEYS.profile, JSON.stringify(App.state.studentProfile));
      }
      if (App.state.role === 'user' || App.state.role === 'admin') {
        localStorage.setItem(this.KEYS.session, JSON.stringify({ role: App.state.role }));
      } else {
        localStorage.removeItem(this.KEYS.session);
      }
    } catch (e) {
      // Silently fail - localStorage may be full or disabled
    }
  },

  seed() {
    if (App.state.quizzes.length === 0) {
      const sampleQuiz = generateSampleQuiz();
      App.state.quizzes.push(sampleQuiz);
      this.save();
    }
  }
};

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(ts) {
  const d = new Date(ts);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function toDatetimeLocalValue(ms) {
  if (ms == null || !Number.isFinite(ms)) return '';
  const d = new Date(ms);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function migrateQuizzes() {
  App.state.quizzes.forEach(q => {
    if (typeof q.maxAttempts !== 'number' || !Number.isFinite(q.maxAttempts) || q.maxAttempts < 1) {
      q.maxAttempts = 1;
    }
    if (q.maxAttempts > 99) q.maxAttempts = 99;
    if (q.deadlineAt != null && typeof q.deadlineAt !== 'number') {
      q.deadlineAt = null;
    }
  });
}

function getAttemptCount(quizId, studentId) {
  if (!studentId) return 0;
  return App.state.submissions.filter(s => s.quizId === quizId && s.studentId === studentId).length;
}

function isPastDeadline(quiz) {
  return quiz.deadlineAt != null && Number.isFinite(quiz.deadlineAt) && Date.now() > quiz.deadlineAt;
}

function studentCanTakeQuiz(quiz, studentId) {
  if (!studentId) return false;
  if (isPastDeadline(quiz)) return false;
  return getAttemptCount(quiz.id, studentId) < quiz.maxAttempts;
}

function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('view--active'));
  const target = document.getElementById('view-' + viewId);
  if (target) {
    target.classList.add('view--active');
    App.state.currentView = viewId;
    window.scrollTo(0, 0);
  }

  // Re-render dashboards whenever they come into view so data is fresh
  if (viewId === 'admin-dashboard') renderAdminDashboard();
  if (viewId === 'user-dashboard') renderUserDashboard();
}

function setError(elId, msg) {
  const el = document.getElementById(elId);
  if (el) el.textContent = msg;
}

function clearError(elId) {
  setError(elId, '');
}

function restoreInitialView() {
  if (App.state.role === 'admin') {
    renderAdminDashboard();
    showView('admin-dashboard');
    return;
  }
  if (App.state.role === 'user') {
    renderUserDashboard();
    showView('user-dashboard');
    return;
  }
  showView('landing');
}

function setRandomStudentIdPlaceholder() {
  const sid = document.getElementById('student-id');
  if (!sid) return;
  const year = 2020 + Math.floor(Math.random() * 7);
  const seq = String(Math.floor(Math.random() * 90000) + 10000);
  const tail = Math.floor(Math.random() * 10);
  sid.placeholder = `e.g. ${year}-${seq}-MN-${tail}`;
}

/* --- 4. SAMPLE DATA GENERATOR --- */

function generateSampleQuiz() {
  return {
    id: generateId(),
    title: 'JavaScript Basics',
    description: 'A quick review of variables, functions, and events from Module 4.',
    createdAt: Date.now(),
    maxAttempts: 1,
    deadlineAt: null,
    questions: [
      {
        id: generateId(),
        type: 'multiple-choice',
        text: 'Which keyword is used to declare a block-scoped variable in modern JavaScript?',
        options: ['var', 'let', 'const', 'function'],
        correctAnswer: 'let',
        explanation: 'The let keyword declares a variable that is limited in scope to the block, statement, or expression in which it is used.'
      },
      {
        id: generateId(),
        type: 'true-false',
        text: 'The addEventListener() method can only attach one handler per event.',
        options: ['True', 'False'],
        correctAnswer: 'False',
        explanation: 'addEventListener() does not override existing handlers. You can attach multiple listeners to the same event on the same element.'
      },
      {
        id: generateId(),
        type: 'typewritten',
        text: 'What method converts a value to a string in JavaScript?',
        correctAnswer: 'String',
        caseSensitive: false,
        explanation: 'The String() function converts a value to a string. It behaves like toString() for most objects.'
      }
    ]
  };
}

document.addEventListener('DOMContentLoaded', () => {
  Storage.load();
  Storage.seed();
  bindEvents();
  restoreInitialView();
});

function bindEvents() {
  // Landing role selection
  document.querySelectorAll('.role-card').forEach(card => {
    card.addEventListener('click', () => {
      App.state.role = card.dataset.role;
      showView('auth');
      clearError('auth-error');
      const input = document.getElementById('class-code');
      input.value = '';
      input.focus();

      const hintEl = document.getElementById('auth-hint');
      if (hintEl) {
        hintEl.textContent =
          App.state.role === 'admin'
            ? 'Enter the instructor code issued to you. If you need access, contact your department or faculty coordinator.'
            : 'Ask your instructor for the class code.';
      }

      // Show student info fields only for the student role
      const studentFields = document.getElementById('student-fields');
      if (studentFields) {
        studentFields.style.display = App.state.role === 'user' ? 'flex' : 'none';
      }

      const firstEl = document.getElementById('student-first');
      const lastEl = document.getElementById('student-last');
      const sidEl = document.getElementById('student-id');
      if (firstEl) firstEl.value = '';
      if (lastEl) lastEl.value = '';
      if (sidEl) sidEl.value = '';
      if (App.state.role === 'user') {
        setRandomStudentIdPlaceholder();
      }
    });
  });

  // Auth form
  document.getElementById('auth-form').addEventListener('submit', handleAuth);
  document.querySelector('.btn-back').addEventListener('click', () => showView('landing'));

  // Admin dashboard
  document.getElementById('btn-create-quiz').addEventListener('click', () => openBuilder());
  document.getElementById('admin-logout').addEventListener('click', logout);

  // Builder
  document.getElementById('builder-cancel').addEventListener('click', () => {
    App.state.editingQuizId = null;
    showView('admin-dashboard');
  });
  document.getElementById('btn-add-question').addEventListener('click', () => addBuilderQuestion());
  document.getElementById('btn-save-quiz').addEventListener('click', saveQuiz);

  // User dashboard
  document.getElementById('user-logout').addEventListener('click', logout);

  // Taker
  document.getElementById('taker-exit').addEventListener('click', () => showView('user-dashboard'));
  document.getElementById('quiz-form').addEventListener('submit', handleQuizSubmit);
  document.getElementById('taker-questions').addEventListener('change', trackTakerProgress);
  document.getElementById('taker-questions').addEventListener('input', trackTakerProgress);

  // Results
  document.getElementById('results-done').addEventListener('click', () => showView('user-dashboard'));

  // Admin stats
  document.getElementById('stats-back').addEventListener('click', () => showView('admin-dashboard'));
}

function handleAuth(e) {
  e.preventDefault();
  const input = document.getElementById('class-code');
  const code = input.value.trim();
  const expected = App.codes[App.state.role];

  if (code !== expected) {
    setError('auth-error', 'Invalid class code. Please try again.');
    return;
  }

  // For students, require name and student number
  if (App.state.role === 'user') {
    const first = document.getElementById('student-first').value.trim();
    const last = document.getElementById('student-last').value.trim();
    const sid = document.getElementById('student-id').value.trim();

    if (!first || !last || !sid) {
      setError('auth-error', 'Please fill in all student information fields.');
      return;
    }

    App.state.studentProfile = { firstName: first, lastName: last, studentId: sid };
    Storage.save();
  }

  clearError('auth-error');
  if (App.state.role === 'admin') {
    Storage.save();
    renderAdminDashboard();
    showView('admin-dashboard');
  } else {
    renderUserDashboard();
    showView('user-dashboard');
  }
}

function logout() {
  App.state.role = null;
  App.state.editingQuizId = null;
  App.state.takingQuizId = null;
  App.state.currentResult = null;
  App.state.builderQuestions = [];
  App.state.studentProfile = null;
  Storage.save();
  showView('landing');
}

function renderAdminDashboard() {
  const listEl = document.getElementById('admin-quiz-list');
  const emptyEl = document.getElementById('admin-empty');
  const statsRow = document.getElementById('admin-stats-row');

  // Compute aggregate stats. reduce() walks through every submission
  // and accumulates the total score, then we divide by count.
  const totalQuizzes = App.state.quizzes.length;
  const totalSubmissions = App.state.submissions.length;
  const avgScore = totalSubmissions > 0
    ? Math.round(App.state.submissions.reduce((s, sub) => s + sub.score, 0) / totalSubmissions)
    : 0;

  statsRow.innerHTML = `
    <div class="stat-card"><div class="stat-value">${totalQuizzes}</div><div class="stat-label">Quizzes</div></div>
    <div class="stat-card"><div class="stat-value">${totalSubmissions}</div><div class="stat-label">Submissions</div></div>
    <div class="stat-card"><div class="stat-value">${avgScore}</div><div class="stat-label">Avg Score</div></div>
  `;

  if (App.state.quizzes.length === 0) {
    listEl.innerHTML = '';
    listEl.style.display = 'none';
    emptyEl.style.display = 'block';
    return;
  }

  listEl.style.display = 'flex';
  emptyEl.style.display = 'none';

  listEl.innerHTML = App.state.quizzes.map(quiz => {
    const subs = App.state.submissions.filter(s => s.quizId === quiz.id);
    const maxA = quiz.maxAttempts != null ? quiz.maxAttempts : 1;
    const dueMeta =
      quiz.deadlineAt != null && Number.isFinite(quiz.deadlineAt)
        ? ` · Due ${formatDateTime(quiz.deadlineAt)}`
        : '';
    return `
      <div class="list-item">
        <div class="list-item-info">
          <div class="list-item-title">${escapeHtml(quiz.title)}</div>
          <div class="list-item-meta">${quiz.questions.length} questions · max ${maxA} tr${maxA === 1 ? 'y' : 'ies'} · ${subs.length} submission${subs.length !== 1 ? 's' : ''}${dueMeta}</div>
        </div>
        <div class="list-item-actions">
          <button class="btn btn--ghost btn--sm" data-action="edit" data-quiz-id="${quiz.id}" type="button">Edit</button>
          <button class="btn btn--ghost btn--sm" data-action="stats" data-quiz-id="${quiz.id}" type="button">Stats</button>
          <button class="btn btn--ghost btn--sm" data-action="delete" data-quiz-id="${quiz.id}" type="button">Delete</button>
        </div>
      </div>
    `;
  }).join('');

  // Attach event listeners instead of inline onclick to avoid global scope issues
  listEl.querySelectorAll('button[data-action="edit"]').forEach(btn => {
    btn.addEventListener('click', () => openBuilder(btn.dataset.quizId));
  });
  listEl.querySelectorAll('button[data-action="stats"]').forEach(btn => {
    btn.addEventListener('click', () => viewStats(btn.dataset.quizId));
  });
  listEl.querySelectorAll('button[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', () => deleteQuiz(btn.dataset.quizId));
  });
}

function openBuilder(quizId) {
  App.state.editingQuizId = quizId || null;
  App.state.builderQuestions = [];

  const titleEl = document.getElementById('quiz-title');
  const descEl = document.getElementById('quiz-desc');
  const maxEl = document.getElementById('quiz-max-attempts');
  const deadlineEl = document.getElementById('quiz-deadline');
  const builderTitle = document.getElementById('builder-title-text');

  if (quizId) {
    const quiz = App.state.quizzes.find(q => q.id === quizId);
    if (quiz) {
      builderTitle.textContent = 'Edit Quiz';
      titleEl.value = quiz.title;
      descEl.value = quiz.description || '';
      if (maxEl) maxEl.value = String(quiz.maxAttempts != null ? quiz.maxAttempts : 1);
      if (deadlineEl) deadlineEl.value = toDatetimeLocalValue(quiz.deadlineAt);
      // Deep copy questions so we don't mutate until save
      App.state.builderQuestions = JSON.parse(JSON.stringify(quiz.questions));
    }
  } else {
    builderTitle.textContent = 'Create Quiz';
    titleEl.value = '';
    descEl.value = '';
    if (maxEl) maxEl.value = '1';
    if (deadlineEl) deadlineEl.value = '';
  }

  renderBuilderQuestions();
  showView('quiz-builder');
}

function renderBuilderQuestions() {
  const container = document.getElementById('questions-container');
  const countEl = document.getElementById('question-count');

  container.innerHTML = '';
  countEl.textContent = `${App.state.builderQuestions.length} question${App.state.builderQuestions.length !== 1 ? 's' : ''}`;

  App.state.builderQuestions.forEach((q, idx) => {
    const card = createQuestionCard(q, idx);
    container.appendChild(card);
  });
}

function createQuestionCard(question, index) {
  const card = document.createElement('div');
  card.className = 'question-card';
  card.dataset.index = index;

  // Header (collapsible toggle)
  const header = document.createElement('button');
  header.className = 'question-header';
  header.type = 'button';
  header.setAttribute('aria-expanded', 'false');

  const headerLeft = document.createElement('div');
  headerLeft.className = 'question-header-left';

  const numberBadge = document.createElement('span');
  numberBadge.className = 'question-number';
  numberBadge.textContent = index + 1;

  const preview = document.createElement('span');
  preview.className = 'question-preview';
  preview.textContent = question.text || 'Untitled question';

  headerLeft.appendChild(numberBadge);
  headerLeft.appendChild(preview);

  const toggle = document.createElement('span');
  toggle.className = 'question-toggle';
  toggle.innerHTML = '&#9662;'; // down arrow

  header.appendChild(headerLeft);
  header.appendChild(toggle);

  // Body (form fields)
  const body = document.createElement('div');
  body.className = 'question-body';

  // Question text
  const textGroup = document.createElement('div');
  textGroup.className = 'field-group';
  const textLabel = document.createElement('label');
  textLabel.className = 'field-label';
  textLabel.textContent = 'Question';
  const textInput = document.createElement('input');
  textInput.type = 'text';
  textInput.className = 'field-input';
  textInput.placeholder = 'Type your question here';
  textInput.value = question.text || '';
  textInput.addEventListener('input', () => {
    question.text = textInput.value;
    preview.textContent = textInput.value || 'Untitled question';
  });
  textGroup.appendChild(textLabel);
  textGroup.appendChild(textInput);

  // Type selector
  const typeGroup = document.createElement('div');
  typeGroup.className = 'field-group';
  const typeLabel = document.createElement('label');
  typeLabel.className = 'field-label';
  typeLabel.textContent = 'Answer Type';
  const typeSelect = document.createElement('select');
  typeSelect.className = 'field-input';
  const types = [
    { value: 'multiple-choice', label: 'Multiple Choice' },
    { value: 'yes-no', label: 'Yes or No' },
    { value: 'true-false', label: 'True or False' },
    { value: 'typewritten', label: 'Typewritten' }
  ];
  types.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.value;
    opt.textContent = t.label;
    if (t.value === question.type) opt.selected = true;
    typeSelect.appendChild(opt);
  });
  typeSelect.addEventListener('change', () => {
    question.type = typeSelect.value;
    // Reset answer-specific fields on type change
    if (question.type === 'multiple-choice') {
      question.options = ['', ''];
      question.correctAnswer = '';
    } else if (question.type === 'yes-no') {
      question.options = ['Yes', 'No'];
      question.correctAnswer = 'Yes';
    } else if (question.type === 'true-false') {
      question.options = ['True', 'False'];
      question.correctAnswer = 'True';
    } else if (question.type === 'typewritten') {
      question.options = [];
      question.correctAnswer = '';
    }
    // Re-render just this card's answer area
    refreshAnswerArea(answerArea, question);
  });
  typeGroup.appendChild(typeLabel);
  typeGroup.appendChild(typeSelect);

  // Answer area container
  const answerArea = document.createElement('div');
  answerArea.className = 'answer-area';

  // Explanation
  const explGroup = document.createElement('div');
  explGroup.className = 'field-group';
  const explLabel = document.createElement('label');
  explLabel.className = 'field-label';
  explLabel.textContent = 'Explanation';
  const explInput = document.createElement('textarea');
  explInput.className = 'field-input field-input--area';
  explInput.rows = 2;
  explInput.placeholder = 'Explain why the correct answer is right.';
  explInput.value = question.explanation || '';
  explInput.addEventListener('input', () => {
    question.explanation = explInput.value;
  });
  explGroup.appendChild(explLabel);
  explGroup.appendChild(explInput);

  // Delete button
  const actionRow = document.createElement('div');
  actionRow.className = 'question-actions-row';
  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.className = 'btn-remove';
  delBtn.textContent = 'Remove question';
  delBtn.addEventListener('click', () => {
    App.state.builderQuestions.splice(index, 1);
    renderBuilderQuestions();
  });
  actionRow.appendChild(delBtn);

  body.appendChild(textGroup);
  body.appendChild(typeGroup);
  body.appendChild(answerArea);
  body.appendChild(explGroup);
  body.appendChild(actionRow);

  card.appendChild(header);
  card.appendChild(body);

  // Collapsible toggle behavior
  header.addEventListener('click', () => {
    const isOpen = card.classList.toggle('is-open');
    header.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  // Populate answer area
  refreshAnswerArea(answerArea, question);

  // Open by default if it's the last (newly added) question and empty
  if (index === App.state.builderQuestions.length - 1 && !question.text) {
    card.classList.add('is-open');
    header.setAttribute('aria-expanded', 'true');
  }

  return card;
}

function refreshAnswerArea(container, question) {
  container.innerHTML = '';

  if (question.type === 'multiple-choice') {
    buildMultipleChoiceAnswer(container, question);
  } else if (question.type === 'yes-no' || question.type === 'true-false') {
    buildYesNoTrueFalseAnswer(container, question);
  } else if (question.type === 'typewritten') {
    buildTypewrittenAnswer(container, question);
  }
}

function buildMultipleChoiceAnswer(container, question) {
  const optsLabel = document.createElement('label');
  optsLabel.className = 'field-label';
  optsLabel.textContent = 'Options (select the correct one)';
  container.appendChild(optsLabel);

  const optsList = document.createElement('div');
  optsList.className = 'options-list';

  const options = question.options || ['', ''];
  if (!question.options) question.options = options;

  options.forEach((opt, i) => {
    const row = document.createElement('div');
    row.className = 'option-row';

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'correct-' + question.id;
    radio.className = 'option-radio';
    radio.checked = question.correctAnswer === opt && opt !== '';
    radio.addEventListener('change', () => {
      if (radio.checked) question.correctAnswer = input.value;
    });

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'field-input option-input';
    input.placeholder = `Option ${i + 1}`;
    input.value = opt;
    input.addEventListener('input', () => {
      question.options[i] = input.value;
      if (radio.checked) question.correctAnswer = input.value;
    });

    row.appendChild(radio);
    row.appendChild(input);
    optsList.appendChild(row);
  });

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'btn-add-option';
  addBtn.textContent = '+ Add option';
  addBtn.addEventListener('click', () => {
    question.options.push('');
    refreshAnswerArea(container, question);
  });

  container.appendChild(optsList);
  container.appendChild(addBtn);
}

function buildYesNoTrueFalseAnswer(container, question) {
  const choices = question.type === 'yes-no' ? ['Yes', 'No'] : ['True', 'False'];
  question.options = choices;

  const grid = document.createElement('div');
  grid.className = 'choice-grid';

  choices.forEach(choice => {
    const label = document.createElement('label');
    label.className = 'choice-label';
    if (question.correctAnswer === choice) label.classList.add('is-selected');

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'correct-' + question.id;
    radio.value = choice;
    radio.checked = question.correctAnswer === choice;
    radio.addEventListener('change', () => {
      question.correctAnswer = choice;
      Array.from(grid.children).forEach(lbl => lbl.classList.remove('is-selected'));
      label.classList.add('is-selected');
    });

    label.appendChild(radio);
    label.appendChild(document.createTextNode(choice));
    grid.appendChild(label);
  });

  container.appendChild(grid);
}

function buildTypewrittenAnswer(container, question) {
  const ansGroup = document.createElement('div');
  ansGroup.className = 'field-group';
  const ansLabel = document.createElement('label');
  ansLabel.className = 'field-label';
  ansLabel.textContent = 'Correct Answer';
  const ansInput = document.createElement('input');
  ansInput.type = 'text';
  ansInput.className = 'field-input';
  ansInput.placeholder = 'Enter the exact correct answer';
  ansInput.value = question.correctAnswer || '';
  ansInput.addEventListener('input', () => {
    question.correctAnswer = ansInput.value;
  });
  ansGroup.appendChild(ansLabel);
  ansGroup.appendChild(ansInput);

  const toggleRow = document.createElement('label');
  toggleRow.className = 'toggle-row';
  const toggle = document.createElement('input');
  toggle.type = 'checkbox';
  toggle.className = 'toggle-switch';
  toggle.checked = !!question.caseSensitive;
  toggle.addEventListener('change', () => {
    question.caseSensitive = toggle.checked;
  });
  const toggleText = document.createElement('span');
  toggleText.textContent = 'Case-sensitive checking';
  toggleRow.appendChild(toggle);
  toggleRow.appendChild(toggleText);

  container.appendChild(ansGroup);
  container.appendChild(toggleRow);
}

function addBuilderQuestion() {
  const newQ = {
    id: generateId(),
    type: 'multiple-choice',
    text: '',
    options: ['', ''],
    correctAnswer: '',
    explanation: ''
  };
  App.state.builderQuestions.push(newQ);
  renderBuilderQuestions();
}

function saveQuiz() {
  const title = document.getElementById('quiz-title').value.trim();
  const desc = document.getElementById('quiz-desc').value.trim();

  if (!title) {
    alert('Please enter a quiz title.');
    document.getElementById('quiz-title').focus();
    return;
  }

  if (App.state.builderQuestions.length === 0) {
    alert('Add at least one question before saving.');
    return;
  }

  // Validate each question
  for (let i = 0; i < App.state.builderQuestions.length; i++) {
    const q = App.state.builderQuestions[i];
    if (!q.text.trim()) {
      alert(`Question ${i + 1} is missing text.`);
      return;
    }
    if (q.type === 'multiple-choice') {
      const filled = q.options.filter(o => o.trim() !== '');
      if (filled.length < 2) {
        alert(`Question ${i + 1} needs at least 2 options.`);
        return;
      }
      if (!q.correctAnswer || !q.options.includes(q.correctAnswer)) {
        alert(`Question ${i + 1} needs a selected correct answer.`);
        return;
      }
    }
    if (q.type === 'typewritten' && !q.correctAnswer.trim()) {
      alert(`Question ${i + 1} needs a correct answer.`);
      return;
    }
  }

  let maxAttempts = parseInt(document.getElementById('quiz-max-attempts').value, 10);
  if (!Number.isFinite(maxAttempts) || maxAttempts < 1) maxAttempts = 1;
  if (maxAttempts > 99) maxAttempts = 99;

  const deadlineRaw = document.getElementById('quiz-deadline').value.trim();
  const deadlineAt = deadlineRaw ? new Date(deadlineRaw).getTime() : null;
  if (deadlineRaw && (deadlineAt == null || Number.isNaN(deadlineAt))) {
    alert('Please enter a valid deadline, or clear the deadline field.');
    document.getElementById('quiz-deadline').focus();
    return;
  }

  if (App.state.editingQuizId) {
    const idx = App.state.quizzes.findIndex(q => q.id === App.state.editingQuizId);
    if (idx !== -1) {
      App.state.quizzes[idx] = {
        ...App.state.quizzes[idx],
        title,
        description: desc,
        maxAttempts,
        deadlineAt: deadlineAt != null && !Number.isNaN(deadlineAt) ? deadlineAt : null,
        questions: JSON.parse(JSON.stringify(App.state.builderQuestions))
      };
    }
  } else {
    App.state.quizzes.push({
      id: generateId(),
      title,
      description: desc,
      createdAt: Date.now(),
      maxAttempts,
      deadlineAt: deadlineAt != null && !Number.isNaN(deadlineAt) ? deadlineAt : null,
      questions: JSON.parse(JSON.stringify(App.state.builderQuestions))
    });
  }

  Storage.save();
  App.state.editingQuizId = null;
  renderAdminDashboard();
  showView('admin-dashboard');
}

/* --- 9. USER DASHBOARD RENDERER --- */

function renderUserDashboard() {
  const listEl = document.getElementById('user-quiz-list');
  const emptyEl = document.getElementById('user-empty');
  const resultsEl = document.getElementById('user-results-list');
  const resultsEmptyEl = document.getElementById('user-results-empty');

  // Show a personalized welcome if we have the student's profile
  const profile = App.state.studentProfile;
  const welcomeEl = document.getElementById('user-welcome');
  if (welcomeEl && profile) {
    welcomeEl.innerHTML = `Welcome, <strong>${escapeHtml(profile.firstName)}</strong> <span style="color:var(--text-secondary);font-size:13px;">(${escapeHtml(profile.studentId)})</span>`;
    welcomeEl.style.display = 'block';
  } else if (welcomeEl) {
    welcomeEl.style.display = 'none';
  }

  // Available quizzes
  if (App.state.quizzes.length === 0) {
    listEl.innerHTML = '';
    listEl.style.display = 'none';
    emptyEl.style.display = 'block';
  } else {
    listEl.style.display = 'flex';
    emptyEl.style.display = 'none';
    listEl.innerHTML = App.state.quizzes.map(quiz => {
      const sid = profile && profile.studentId;
      const attempts = sid ? getAttemptCount(quiz.id, sid) : 0;
      const maxA = quiz.maxAttempts != null ? quiz.maxAttempts : 1;
      const pastDue = isPastDeadline(quiz);
      const canTake = sid ? studentCanTakeQuiz(quiz, sid) : false;

      const metaBits = [`${quiz.questions.length} questions`, `${attempts}/${maxA} tr${maxA === 1 ? 'y' : 'ies'}`];
      if (quiz.deadlineAt != null && Number.isFinite(quiz.deadlineAt)) {
        metaBits.push(`Due ${formatDateTime(quiz.deadlineAt)}`);
      }

      let actionHtml = '';
      if (!sid) {
        actionHtml = '<span class="list-item-badge">Profile required</span>';
      } else if (pastDue) {
        actionHtml = '<span class="list-item-badge">Past deadline</span>';
      } else if (canTake) {
        actionHtml = `<button class="btn btn--primary btn--sm" data-action="take" data-quiz-id="${quiz.id}" type="button">Take Quiz</button>`;
      } else {
        actionHtml = '<span class="list-item-badge">No tries left</span>';
      }

      return `
      <div class="list-item">
        <div class="list-item-info">
          <div class="list-item-title">${escapeHtml(quiz.title)}</div>
          <div class="list-item-meta">${metaBits.join(' · ')}</div>
        </div>
        <div class="list-item-actions">${actionHtml}</div>
      </div>`;
    }).join('');

    listEl.querySelectorAll('button[data-action="take"]').forEach(btn => {
      btn.addEventListener('click', () => startQuiz(btn.dataset.quizId));
    });
  }

  // Past results - filter by the current student's profile if available
  const myResults = App.state.submissions.filter(s => {
    if (profile && profile.studentId) {
      return s.studentId === profile.studentId;
    }
    return s.userName !== 'Admin'; // fallback
  });
  if (myResults.length === 0) {
    resultsEl.innerHTML = '';
    resultsEl.style.display = 'none';
    resultsEmptyEl.style.display = 'block';
  } else {
    resultsEl.style.display = 'flex';
    resultsEmptyEl.style.display = 'none';
    resultsEl.innerHTML = myResults.map(sub => {
      const quiz = App.state.quizzes.find(q => q.id === sub.quizId);
      const quizTitle = quiz ? quiz.title : 'Unknown Quiz';
      return `
        <div class="list-item">
          <div class="list-item-info">
            <div class="list-item-title">${escapeHtml(quizTitle)}</div>
            <div class="list-item-meta">${formatDate(sub.submittedAt)}</div>
          </div>
          <div class="list-item-actions">
            <span class="stat-value" style="font-size:18px;">${sub.score}/${sub.totalQuestions}</span>
          </div>
        </div>
      `;
    }).join('');
  }
}

function buildTakerRadioChoice(container, questionId, optionText) {
  const row = document.createElement('label');
  row.className = 'tq-choice';
  const radio = document.createElement('input');
  radio.type = 'radio';
  radio.name = 'q-' + questionId;
  radio.value = optionText;
  radio.required = true;
  radio.addEventListener('change', () => {
    row.parentElement.querySelectorAll('.tq-choice').forEach(c => c.classList.remove('is-selected'));
    row.classList.add('is-selected');
  });
  row.appendChild(radio);
  row.appendChild(document.createTextNode(optionText));
  container.appendChild(row);
}

function startQuiz(quizId) {
  const quiz = App.state.quizzes.find(q => q.id === quizId);
  if (!quiz) return;

  const profile = App.state.studentProfile;
  if (!profile || !profile.studentId) {
    alert('Student profile is missing. Please sign in again.');
    return;
  }
  if (!studentCanTakeQuiz(quiz, profile.studentId)) {
    if (isPastDeadline(quiz)) {
      alert('The deadline for this quiz has passed.');
    } else {
      alert(`You have used all ${quiz.maxAttempts} allowed attempt${quiz.maxAttempts !== 1 ? 's' : ''} for this quiz.`);
    }
    return;
  }

  App.state.takingQuizId = quizId;
  document.getElementById('taker-quiz-title').textContent = quiz.title;
  document.getElementById('taker-quiz-desc').textContent = quiz.description || '';

  const container = document.getElementById('taker-questions');
  container.innerHTML = '';

  quiz.questions.forEach((q, idx) => {
    const qEl = document.createElement('div');
    qEl.className = 'taker-question';
    qEl.dataset.id = q.id;

    const label = document.createElement('div');
    label.className = 'tq-label';
    label.innerHTML = `<span class="tq-required">*</span> ${idx + 1}. ${escapeHtml(q.text)}`;
    qEl.appendChild(label);

    const choices = document.createElement('div');
    choices.className = 'tq-choices';

    if (q.type === 'multiple-choice' || q.type === 'yes-no' || q.type === 'true-false') {
      q.options.forEach(opt => {
        buildTakerRadioChoice(choices, q.id, opt);
      });
    } else if (q.type === 'typewritten') {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'tq-input';
      input.name = 'q-' + q.id;
      input.placeholder = 'Type your answer here';
      input.required = true;
      choices.appendChild(input);
    }

    qEl.appendChild(choices);
    container.appendChild(qEl);
  });

  updateTakerProgress(0, quiz.questions.length);
  showView('quiz-taker');
}

function updateTakerProgress(answered, total) {
  const pct = total > 0 ? (answered / total) * 100 : 0;
  document.getElementById('taker-progress-fill').style.width = pct + '%';
  document.getElementById('taker-progress-text').textContent = `${answered} / ${total}`;
}

// Live progress update as user interacts
function trackTakerProgress() {
  const quiz = App.state.quizzes.find(q => q.id === App.state.takingQuizId);
  if (!quiz) return;
  let answered = 0;
  quiz.questions.forEach(q => {
    const inputs = document.getElementsByName('q-' + q.id);
    for (const inp of inputs) {
      if ((inp.type === 'radio' && inp.checked) || (inp.type === 'text' && inp.value.trim())) {
        answered++;
        break;
      }
    }
  });
  updateTakerProgress(answered, quiz.questions.length);
}

function handleQuizSubmit(e) {
  e.preventDefault();
  const quiz = App.state.quizzes.find(q => q.id === App.state.takingQuizId);
  if (!quiz) return;

  const profile = App.state.studentProfile;
  if (!profile || !profile.studentId) {
    alert('Student profile is missing. Please sign in again.');
    return;
  }
  if (!studentCanTakeQuiz(quiz, profile.studentId)) {
    alert('You can no longer submit this quiz (deadline or attempt limit).');
    showView('user-dashboard');
    return;
  }

  const answers = [];
  let score = 0;

  quiz.questions.forEach(q => {
    const inputs = document.getElementsByName('q-' + q.id);
    let userAnswer = '';
    for (const inp of inputs) {
      if (inp.type === 'radio' && inp.checked) {
        userAnswer = inp.value;
        break;
      }
      if (inp.type === 'text') {
        userAnswer = inp.value.trim();
      }
    }

    let isCorrect = false;
    if (q.type === 'typewritten') {
      if (q.caseSensitive) {
        isCorrect = userAnswer === q.correctAnswer;
      } else {
        isCorrect = userAnswer.toLowerCase() === q.correctAnswer.toLowerCase();
      }
    } else {
      isCorrect = userAnswer === q.correctAnswer;
    }

    if (isCorrect) score++;

    answers.push({
      questionId: q.id,
      userAnswer,
      isCorrect
    });
  });

  const submission = {
    id: generateId(),
    quizId: quiz.id,
    userName: profile.firstName && profile.lastName
      ? `${profile.firstName} ${profile.lastName}`
      : 'Student',
    studentId: profile.studentId || '-',
    answers,
    score,
    totalQuestions: quiz.questions.length,
    submittedAt: Date.now()
  };

  App.state.submissions.push(submission);
  Storage.save();

  App.state.currentResult = { quiz, submission };
  renderResults();
  showView('results');
}

function renderResults() {
  const { quiz, submission } = App.state.currentResult;
  if (!quiz || !submission) return;

  document.getElementById('result-score').textContent = submission.score;

  const statsEl = document.getElementById('result-stats');
  const errors = submission.totalQuestions - submission.score;
  const pct = Math.round((submission.score / submission.totalQuestions) * 100);
  statsEl.innerHTML = `
    <div class="result-stat"><div class="result-stat-value">${submission.totalQuestions}</div><div class="result-stat-label">Total</div></div>
    <div class="result-stat"><div class="result-stat-value">${errors}</div><div class="result-stat-label">Errors</div></div>
    <div class="result-stat"><div class="result-stat-value">${pct}%</div><div class="result-stat-label">Accuracy</div></div>
    <div class="result-stat"><div class="result-stat-value">${submission.score}</div><div class="result-stat-label">Correct</div></div>
  `;

  const breakdownEl = document.getElementById('result-breakdown');
  breakdownEl.innerHTML = '';

  quiz.questions.forEach((q, idx) => {
    const ans = submission.answers.find(a => a.questionId === q.id);
    const isCorrect = ans ? ans.isCorrect : false;

    const item = document.createElement('div');
    item.className = 'breakdown-item ' + (isCorrect ? 'is-correct' : 'is-wrong');

    const core = document.createElement('div');
    core.className = 'bi-core';

    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'bi-header';

    const headerLeft = document.createElement('div');
    headerLeft.className = 'bi-header-left';

    const number = document.createElement('span');
    number.className = 'bi-number';
    number.textContent = idx + 1;

    const qText = document.createElement('span');
    qText.className = 'bi-question';
    qText.textContent = q.text;

    const status = document.createElement('span');
    status.className = 'bi-status ' + (isCorrect ? 'correct' : 'wrong');
    status.textContent = isCorrect ? 'Correct' : 'Wrong';

    headerLeft.appendChild(number);
    headerLeft.appendChild(qText);

    const toggle = document.createElement('span');
    toggle.className = 'bi-toggle';
    toggle.innerHTML = '<i class="ph ph-caret-down"></i>';

    header.appendChild(headerLeft);
    header.appendChild(status);
    header.appendChild(toggle);

    const body = document.createElement('div');
    body.className = 'bi-body';

    const yourAns = document.createElement('div');
    yourAns.className = 'bi-line ' + (isCorrect ? '' : 'wrong-answer');
    yourAns.innerHTML = `<strong>Your answer</strong><span class="bi-value">${escapeHtml(ans ? ans.userAnswer || '(empty)' : '(empty)')}</span>`;

    const correctAns = document.createElement('div');
    correctAns.className = 'bi-line correct-answer';
    correctAns.innerHTML = `<strong>Correct answer</strong><span class="bi-value">${escapeHtml(q.correctAnswer)}</span>`;

    body.appendChild(yourAns);
    body.appendChild(correctAns);

    if (q.explanation) {
      const divider = document.createElement('div');
      divider.className = 'bi-divider';
      body.appendChild(divider);

      const expl = document.createElement('div');
      expl.className = 'bi-line explanation';
      expl.innerHTML = `<strong>Explanation</strong><span class="bi-value">${escapeHtml(q.explanation)}</span>`;
      body.appendChild(expl);
    }

    header.addEventListener('click', () => {
      item.classList.toggle('is-open');
    });

    core.appendChild(header);
    core.appendChild(body);
    item.appendChild(core);
    breakdownEl.appendChild(item);
  });
}

function resetStudentQuizAttempts(quizId, studentId) {
  const quiz = App.state.quizzes.find(q => q.id === quizId);
  const label = quiz ? `"${quiz.title}"` : 'this quiz';
  if (
    !confirm(
      `Remove all submissions for this student on ${label}? They will be able to try again.`
    )
  ) {
    return;
  }
  App.state.submissions = App.state.submissions.filter(
    s => !(s.quizId === quizId && s.studentId === studentId)
  );
  Storage.save();
  renderAdminDashboard();
  viewStats(quizId);
}

function viewStats(quizId) {
  const quiz = App.state.quizzes.find(q => q.id === quizId);
  if (!quiz) return;

  document.getElementById('stats-quiz-title').textContent = `Stats: ${quiz.title}`;

  const subs = App.state.submissions.filter(s => s.quizId === quizId);
  const summaryEl = document.getElementById('stats-summary');
  const tbody = document.getElementById('stats-table-body');
  const emptyEl = document.getElementById('stats-empty');
  const tableWrap = document.querySelector('.table-wrap');

  if (subs.length === 0) {
    summaryEl.style.display = 'none';
    tableWrap.style.display = 'none';
    emptyEl.style.display = 'block';
    showView('admin-stats');
    return;
  }

  summaryEl.style.display = 'grid';
  tableWrap.style.display = 'block';
  emptyEl.style.display = 'none';

  const avg = Math.round(subs.reduce((s, sub) => s + sub.score, 0) / subs.length);
  const best = Math.max(...subs.map(s => s.score));
  const worst = Math.min(...subs.map(s => s.score));

  summaryEl.innerHTML = `
    <div class="stat-card"><div class="stat-value">${subs.length}</div><div class="stat-label">Submissions</div></div>
    <div class="stat-card"><div class="stat-value">${avg}</div><div class="stat-label">Average</div></div>
    <div class="stat-card"><div class="stat-value">${best}</div><div class="stat-label">Highest</div></div>
    <div class="stat-card"><div class="stat-value">${worst}</div><div class="stat-label">Lowest</div></div>
  `;

  tbody.innerHTML = subs
    .map(sub => {
      const errors = sub.totalQuestions - sub.score;
      const encSid = encodeURIComponent(sub.studentId || '');
      return `
      <tr>
        <td>${escapeHtml(sub.userName)}</td>
        <td>${escapeHtml(sub.studentId || '-')}</td>
        <td><strong>${sub.score}</strong> / ${sub.totalQuestions}</td>
        <td>${errors}</td>
        <td>${formatDate(sub.submittedAt)}</td>
        <td>
          <button class="btn btn--ghost btn--sm" type="button" data-action="reset-attempts" data-quiz-id="${quiz.id}" data-student-id="${encSid}">Reset tries</button>
        </td>
      </tr>`;
    })
    .join('');

  tbody.querySelectorAll('button[data-action="reset-attempts"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const qid = btn.dataset.quizId;
      const sid = decodeURIComponent(btn.dataset.studentId || '');
      resetStudentQuizAttempts(qid, sid);
    });
  });

  showView('admin-stats');
}

function deleteQuiz(quizId) {
  const quiz = App.state.quizzes.find(q => q.id === quizId);
  if (!quiz) return;
  if (!confirm(`Delete "${quiz.title}"? This cannot be undone.`)) return;

  App.state.quizzes = App.state.quizzes.filter(q => q.id !== quizId);
  App.state.submissions = App.state.submissions.filter(s => s.quizId !== quizId);
  Storage.save();
  renderAdminDashboard();
}
