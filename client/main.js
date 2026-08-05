function initScrollAnimation(selector, options = {}) {
  if (window.innerWidth >= 2000) {
    return;
  }
  
  let {
    translateY = 60,
    duration = 0.5,
    rootMargin = '0px 0px -60px 0px',
    threshold = [0, 0.1, 0.5, 1]
  } = options;

  if (window.innerWidth <= 450) {
    rootMargin = '0px 0px 0px 0px';
    threshold = [0, 0.1, 0.2, 1];
  }
  
  const element = document.querySelector(selector);
  if (!element) {
    console.warn(`Element with selector "${selector}" not found`);
    return;
  }
  
  let isBlockVisible = false;
  let isScrollingDown = true;
  let lastScrollY = window.scrollY;
  let hasBeenVisible = false;
  let isFirstIntersection = true;
  
  element.style.opacity = '0';
  element.style.transform = `translateY(${translateY}px)`;
  element.style.transition = `opacity ${duration}s ease, transform ${duration}s ease`;
  
  function checkInitialVisibility() {
    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const isVisible = rect.top < windowHeight - 100 && rect.bottom > 100;
    
    if (isVisible) {
      element.style.opacity = '1';
      element.style.transform = 'translateY(0)';
      isBlockVisible = true;
      hasBeenVisible = true;
      isFirstIntersection = false;
      return true;
    }
    return false;
  }
  
  const wasVisibleInitially = checkInitialVisibility();
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const currentScrollY = window.scrollY;
      const isDown = currentScrollY > lastScrollY;
      
      if (currentScrollY !== lastScrollY) {
        isScrollingDown = isDown;
      }
      
      if (entry.isIntersecting) {
        if (isScrollingDown || isFirstIntersection || hasBeenVisible) {
          element.style.opacity = '1';
          element.style.transform = 'translateY(0)';
          isBlockVisible = true;
          hasBeenVisible = true;
          isFirstIntersection = false;
        }
      } else {
        if (!isScrollingDown && isBlockVisible) {
          element.style.opacity = '0';
          element.style.transform = `translateY(${translateY}px)`;
          isBlockVisible = false;
        }
      }
      
      lastScrollY = currentScrollY;
    });
  }, {
    threshold: threshold,
    rootMargin: rootMargin
  });
  
  observer.observe(element);
  
  return observer;
}

let userId = localStorage.getItem('chatUserId');
if (!userId) {
  userId = crypto.randomUUID();
  localStorage.setItem('chatUserId', userId);
}

const chat = document.querySelector('.chat');
const chatBanner = document.querySelector('.chat-banner');
const chatTarget = document.querySelector('.contacts__social');
const chatWarning = document.querySelector('.chat__warning');
const chatMessages = document.querySelector('.chat__messages');
let isFirstMessage = true;
let canShowChat = true;

window.addEventListener('scroll', () => {
  const rect = chatTarget.getBoundingClientRect();
  
  if (rect.top <= window.innerHeight && canShowChat) {
    canShowChat = false;
    if (window.innerWidth > 450) {
      chatBanner.style.width = '240px';
    } else {
      chatBanner.style.width = '222px';
    }
    setTimeout(() => {
      if (window.innerWidth > 450) {
        chatBanner.style.width = '60px';
      } else {
        chatBanner.style.width = '54px';
      }
    }, 6000)
  }
});

chatBanner.addEventListener('click', () => {
  chatBanner.style.display = 'none';
  chat.style.display = 'block';
  chatMessages.scrollTop = chatMessages.scrollHeight;
  setTimeout(() => {chat.style.maxHeight = '557px'}, 1);
});

document.querySelector('.chat__header .close').addEventListener('click', () => {
  chatBanner.style.display = 'flex';
  chat.style.display = 'none';
  chat.style.maxHeight = '0';
});

const socket = io({
  query: { userId: userId },
  withCredentials: true
});

socket.on('chat_history', (messages) => {
  if (messages.length > 0) {
    isFirstMessage = false;
    chatWarning.style.display = 'none';
    chatMessages.style.display = 'flex';
    messages.forEach(msg => {
      renderMessage(msg.sender_type, msg.text, new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  try {
    if (messages[messages.length - 1].sender_type == 'admin') {
    document.querySelector('.chat__container').classList.add('active');
    chatBanner.style.display = 'none';
    chat.style.display = 'block';
    setTimeout(() => {chat.style.maxHeight = '557px'}, 1);
  }
  } catch (error) {}
});

function sendMessage() {
  const text = document.querySelector('.chat__input-area .input input').value;
  if (!text.trim()) return;

  socket.emit('user_message', text);
  renderMessage('user', text, new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }));

  if (isFirstMessage) {
    chatWarning.style.display = 'none';
    chatMessages.style.display = 'flex';
    const div = document.createElement('div');
    div.className = 'greeting';
    div.textContent = 'Спасибо за вопрос! Ответим в течении 24 часов, возвращайтесь 💬';
    chatMessages.appendChild(div);
  }

  document.querySelector('.chat__input-area .input input').value = '';
}

document.querySelector('.chat__input-area .button').addEventListener('click', sendMessage);

document.querySelector('.chat__input-area .input input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});

socket.on('new_admin_message', ({ text, time }) => {
  renderMessage('admin', text, time);
});

function renderMessage(type, text, time) {
  const div = document.createElement('div');
  div.className = `message ${type}`;
  const textBlock = document.createElement('div');
  textBlock.className = 'text';
  textBlock.textContent = text;
  const timeBlock = document.createElement('div');
  timeBlock.className = 'time';
  timeBlock.textContent = time;
  div.appendChild(textBlock);
  div.appendChild(timeBlock);
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

document.addEventListener('DOMContentLoaded', function() {
  const chat = document.querySelector('.chat__container');
  const targer = document.querySelector('.about__section--banner');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        chat.classList.add('active');
        observer.disconnect();
      }
    });
  }, { threshold: 0.2 });

  const checkPositionAndShow = () => {
    const rect = targer.getBoundingClientRect();
    const isVisibleOrBelow = rect.top <= window.innerHeight;

    if (isVisibleOrBelow) {
      chat.classList.add('active', 'immediate');
      observer.disconnect();
      return true;
    }
    return false;
  };

  if (checkPositionAndShow()) return;

  observer.observe(targer);
});

document.addEventListener('DOMContentLoaded', function() {
  const burger = document.querySelector('.burger');
  const menu = document.querySelector('.header__nav');

  burger.addEventListener('click', () => {
      burger.classList.toggle('is-active');
      menu.classList.toggle('active');
      window.scrollBy({top: -100, behavior: 'smooth'});
      document.querySelector('body').classList.toggle('fixed');
  });

  document.querySelectorAll('.nav__item').forEach(el => {
    el.addEventListener('click', () => {
      burger.classList.remove('is-active');
      menu.classList.remove('active');
      document.querySelector('body').classList.remove('fixed');
    });
  });

  document.querySelector('.header__btn a').addEventListener('click', () => {
    burger.classList.remove('is-active');
    menu.classList.remove('active');
    document.querySelector('body').classList.remove('fixed');
  });

  let phone1 = document.querySelector('#page-form__phone');

  let maskOptions1 = {
    mask: '+{7} (000) 000-00-00',
    lazy: false,
    placeholderChar: '_'
  };

  let mask1 = IMask(phone1, maskOptions1);

  let phone2 = document.querySelector('#request-form__phone');

  let maskOptions2 = {
    mask: '+{7} (000) 000-00-00',
  };

  let mask2 = IMask(phone2, maskOptions2);

  const formModal = document.querySelector('.form-modal');

  formModal.addEventListener('click', e => {
    if (e.target === formModal) {
      formModal.style.display = 'none';
    }
  });

  document.querySelector('.form-close').addEventListener('click', () => {
    formModal.style.display = 'none';
  });

  document.querySelector('.calculator__button-block button').addEventListener('click', () => {
    formModal.style.display = 'flex';
  });

  document.querySelector('.form__button-block button').addEventListener('click', () => {
    let name = document.querySelector('.form__input-block input').value;
    let tel = document.querySelector('#page-form__phone').value;

    document.querySelector('#request-form__name').value = name.trim();

    if (tel[tel.length - 1] != '_') {
      document.querySelector('#request-form__phone').value = tel;
    }

    formModal.style.display = 'flex';
  });

  document.querySelector('.success-button button').addEventListener('click', () => {
    formModal.style.display = 'none';
  });

  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', function(e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  const elements = [
    document.querySelector('.hero__title'),
    document.querySelector('.hero__subtitle'),
    document.querySelector('.hero__buttons'),
    document.querySelector('.hero__stats')
  ];

  function animateSequentially(elements, delayBetween = 100) {
    elements.forEach((el, index) => {
      if (!el) return;
      
      setTimeout(() => {
        el.classList.add('visible');
        
        if (el.classList.contains('hero__stats')) {
          const stats = el.querySelectorAll('.stat');
          stats.forEach((stat, statIndex) => {
            setTimeout(() => {
              stat.classList.add('visible');
            }, statIndex * 200);
          });
        }
      }, index * delayBetween);
    });

    setTimeout(() => {
      document.querySelector('.banner').style.display = 'block';
    }, 820);
  }

  if (window.innerWidth > 900) {
    animateSequentially(elements, 100);
  }

  initScrollAnimation('.about__container');
  initScrollAnimation('.projects');
  initScrollAnimation('.calculator__title');
  initScrollAnimation('.calculator__container');
  initScrollAnimation('.reviews__title');
  initScrollAnimation('.reviews__container');
  initScrollAnimation('.contacts__container .aside');
  initScrollAnimation('.request__container');

  const switchEl = document.getElementById('switch');
  const buttons = document.querySelectorAll('.switch__btn');
  const stepperValue = document.querySelector('.stepper__value');
  const rangeInput = document.querySelector('.calculator__range input');
  const minusBtn = document.querySelector('.calculator__btn:first-child');
  const plusBtn = document.querySelector('.calculator__btn:last-child');
  const allTypeItems = document.querySelectorAll('.types__item');
  const repairTypes = document.querySelector('.calculator__types.repair');
  const designTypes = document.querySelector('.calculator__types.designproject');
  const approximatePrice = document.querySelector('.calculator__approximate-price');
  const infoTitle = document.querySelector('.calculator__price .calculator__title:nth-child(3)');
  const infoSections = document.querySelectorAll('.calculator__info-section');

  let currentArea = 45;

  function setActive(value) {
    buttons.forEach(btn => {
      btn.classList.toggle('switch__btn--active', btn.dataset.value === value);
    });
    switchEl.classList.toggle('switch--right', value === 'design');
    
    if (value === 'repair') {
      repairTypes.style.display = 'flex';
      designTypes.style.display = 'none';
    } else {
      repairTypes.style.display = 'none';
      designTypes.style.display = 'flex';
    }
    
    calculatePrice();
  }

  function updateArea(value) {
    currentArea = Math.min(200, Math.max(20, value));
    stepperValue.innerHTML = currentArea + ' <span>м<sup>2</sup></span>';
    rangeInput.value = currentArea;
    calculatePrice();
  }

  function getPriceFromElement(element) {
    const text = element.textContent.trim();
    const match = text.match(/(\d[\d\s]*)\s*₽/);
    if (match) {
      return parseInt(match[1].replace(/\s/g, ''));
    }
    return 0;
  }

  function animatePrice(newPrice) {
    const currentText = approximatePrice.textContent.replace(/\s/g, '').replace(/[^\d]/g, '');
    const currentPrice = parseInt(currentText) || 0;
    const difference = newPrice - currentPrice;
    const steps = 20;
    const stepDuration = 5;
    
    if (difference === 0) return;
    
    const stepValue = difference / steps;
    let currentStep = 0;
    
    const interval = setInterval(() => {
      currentStep++;
      const value = Math.round(currentPrice + stepValue * currentStep);
      approximatePrice.innerHTML = value.toLocaleString() + ' <span>₽</span>';
      
      if (currentStep >= steps) {
        clearInterval(interval);
        approximatePrice.innerHTML = newPrice.toLocaleString() + ' <span>₽</span>';
      }
    }, stepDuration);
  }

  function calculatePrice() {
    const activeTab = document.querySelector('.switch__btn--active');
    const tabValue = activeTab ? activeTab.dataset.value : 'repair';
    
    let pricePerMeter = 0;
    let typeName = '';
    
    if (tabValue === 'repair') {
      const activeType = repairTypes.querySelector('.types__item.active');
      if (activeType) {
        pricePerMeter = getPriceFromElement(activeType.querySelector('.value'));
        typeName = activeType.querySelector('.title').textContent;
      }
    } else {
      const activeType = designTypes.querySelector('.types__item.active');
      if (activeType) {
        pricePerMeter = getPriceFromElement(activeType.querySelector('.value'));
        typeName = activeType.querySelector('.title').textContent;
      }
    }
    
    const totalPrice = pricePerMeter * currentArea;
    const formattedPerMeter = pricePerMeter.toLocaleString();
    
    animatePrice(totalPrice);
    
    infoTitle.innerHTML = formattedPerMeter + ' ₽ · ' + currentArea + ' м<sup>2</sup> · включая материалы';
    
    infoSections[0].querySelector('.value').innerHTML = currentArea + ' м<sup>2</sup>';
    infoSections[1].querySelector('.value').textContent = formattedPerMeter + ' ₽';
    
    let days = 30;
    if (tabValue === 'design') {
      days = 15;
    } else if (pricePerMeter >= 80000) {
      days = 60;
    } else if (pricePerMeter >= 50000) {
      days = 45;
    }
    if (tabValue != 'design') {
      if (currentArea >= 50) {
        days += 15
      }
      if (currentArea >= 100) {
        days += 15
      }
      if (currentArea >= 150) {
        days += 15
      }
    }
    infoSections[2].querySelector('.value').textContent = 'от ' + days + ' дней';
  }

  buttons.forEach(btn => {
    btn.addEventListener('click', function() {
      setActive(this.dataset.value);
    });
  });

  minusBtn.addEventListener('click', function() {
    updateArea(currentArea - 1);
  });

  plusBtn.addEventListener('click', function() {
    updateArea(currentArea + 1);
  });

  rangeInput.addEventListener('input', function() {
    updateArea(parseInt(this.value));
  });

  allTypeItems.forEach(item => {
    item.addEventListener('click', function() {
      const parent = this.closest('.calculator__types');
      parent.querySelectorAll('.types__item').forEach(el => {
        el.classList.remove('active');
      });
      this.classList.add('active');
      calculatePrice();
    });
  });

  setActive('repair');

  const list = document.querySelector('.reviews__list');
  const leftArrow = document.querySelector('.reviews__arrow--left');
  const rightArrow = document.querySelector('.reviews__arrow--right');
  const leftImg = leftArrow.querySelector('img');
  const rightImg = rightArrow.querySelector('img');
  const paginationSpans = document.querySelectorAll('.pagination span');
  
  const scrollStep = 450;
  const epsilon = 1;
  
  function updateUI() {
    const maxScroll = list.scrollWidth - list.clientWidth;
    const currentScroll = list.scrollLeft;
    
    const canScrollLeft = currentScroll > epsilon;
    const canScrollRight = currentScroll < maxScroll - epsilon;
    
    leftArrow.classList.toggle('active', canScrollLeft);
    rightArrow.classList.toggle('active', canScrollRight);
    
    leftImg.src = canScrollLeft ? 'img/slider-arrow.svg' : 'img/slider-arrow-disabled.svg';
    rightImg.src = canScrollRight ? 'img/slider-arrow.svg' : 'img/slider-arrow-disabled.svg';
    
    leftImg.style.transform = canScrollLeft ? '' : '';
    rightImg.style.transform = canScrollRight ? 'scale(-1)' : 'scale(-1)';
    
    const progress = maxScroll > 0 ? currentScroll / maxScroll : 0;
    const activeIndex = Math.min(Math.floor(progress * 3), 2);
    
    paginationSpans.forEach((span, i) => {
      span.classList.toggle('active', i === activeIndex);
    });
  }
  
  leftArrow.addEventListener('click', function() {
    if (leftArrow.classList.contains('active')) {
      list.scrollBy({
        left: -scrollStep,
        behavior: 'smooth'
      });
    }
  });
  
  rightArrow.addEventListener('click', function() {
    if (rightArrow.classList.contains('active')) {
      list.scrollBy({
        left: scrollStep,
        behavior: 'smooth'
      });
    }
  });
  
  list.addEventListener('scroll', updateUI);
  
  updateUI();
});

function formatArea(area) {
  const num = parseFloat(area);

  if (Number.isInteger(num)) {
    return num.toString();
  }

  return num.toString();
}

function getDayString(number) {
  if (!Number.isInteger(number) || number < 0) {
    return 'Некорректное число';
  }
  
  const lastDigit = number % 10;
  const lastTwoDigits = number % 100;
  
  let dayForm;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    dayForm = 'дней';
  } else if (lastDigit === 1) {
    dayForm = 'день';
  } else if (lastDigit >= 2 && lastDigit <= 4) {
    dayForm = 'дня';
  } else {
    dayForm = 'дней';
  }
  
  return `${number} ${dayForm}`;
}

function animateClipPath(fromPath, toPath, duration = 800, pathId = 'clipPath', easing = null) {
  return new Promise((resolve) => {
      const pathElement = document.getElementById(pathId);
      if (!pathElement) {
          console.error(`Path с id "${pathId}" не найден`);
          resolve();
          return;
      }

      function parsePathCommands(d) {
          const commands = [];
          let i = 0;
          while (i < d.length) {
              while (i < d.length && d[i] === ' ') i++;
              if (i >= d.length) break;
              
              const cmd = d[i];
              i++;
              
              const numbers = [];
              let currentNum = '';
              let hasDecimal = false;
              
              while (i < d.length) {
                  const char = d[i];
                  if (char === ' ' || char === ',') {
                      if (currentNum) {
                          numbers.push(parseFloat(currentNum));
                          currentNum = '';
                          hasDecimal = false;
                      }
                      i++;
                      continue;
                  }
                  if (char === '-' || char === '.' || (char >= '0' && char <= '9')) {
                      if (char === '.') {
                          if (hasDecimal) {
                              if (currentNum) {
                                  numbers.push(parseFloat(currentNum));
                                  currentNum = '';
                                  hasDecimal = false;
                              }
                          }
                          hasDecimal = true;
                      }
                      currentNum += char;
                      i++;
                      continue;
                  }
                  if ((char >= 'A' && char <= 'Z') || (char >= 'a' && char <= 'z')) {
                      if (currentNum) {
                          numbers.push(parseFloat(currentNum));
                          currentNum = '';
                          hasDecimal = false;
                      }
                      break;
                  }
                  i++;
              }
              if (currentNum) {
                  numbers.push(parseFloat(currentNum));
              }
              
              commands.push({
                  command: cmd,
                  points: numbers
              });
          }
          return commands;
      }

      function buildPathFromCommands(commands) {
          return commands.map(cmd => {
              return cmd.command + ' ' + cmd.points.join(' ');
          }).join(' ');
      }

      function interpolateCommands(cmd1, cmd2, t) {
          if (cmd1.command !== cmd2.command) {
              return {
                  command: cmd1.command,
                  points: cmd1.points.map((p, i) => {
                      const p2 = cmd2.points[i] || p;
                      return p + (p2 - p) * t;
                  })
              };
          }
          
          const points = cmd1.points.map((p, i) => {
              const p2 = cmd2.points[i] !== undefined ? cmd2.points[i] : p;
              return p + (p2 - p) * t;
          });
          
          return {
              command: cmd1.command,
              points: points
          };
      }

      function defaultEasing(t) {
          return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      }

      const easingFunc = easing || defaultEasing;
      
      const fromCommands = parsePathCommands(fromPath);
      const toCommands = parsePathCommands(toPath);
      
      const maxCommands = Math.max(fromCommands.length, toCommands.length);
      while (fromCommands.length < maxCommands) {
          const lastCmd = fromCommands[fromCommands.length - 1];
          fromCommands.push({
              command: lastCmd.command,
              points: new Array(lastCmd.points.length).fill(lastCmd.points[lastCmd.points.length - 1] || 0)
          });
      }
      while (toCommands.length < maxCommands) {
          const lastCmd = toCommands[toCommands.length - 1];
          toCommands.push({
              command: lastCmd.command,
              points: new Array(lastCmd.points.length).fill(lastCmd.points[lastCmd.points.length - 1] || 0)
          });
      }
      
      for (let i = 0; i < maxCommands; i++) {
          const maxPoints = Math.max(fromCommands[i].points.length, toCommands[i].points.length);
          while (fromCommands[i].points.length < maxPoints) {
              const lastVal = fromCommands[i].points[fromCommands[i].points.length - 1] || 0;
              fromCommands[i].points.push(lastVal);
          }
          while (toCommands[i].points.length < maxPoints) {
              const lastVal = toCommands[i].points[toCommands[i].points.length - 1] || 0;
              toCommands[i].points.push(lastVal);
          }
      }

      const startTime = performance.now();
      
      function update(currentTime) {
          const elapsed = currentTime - startTime;
          let progress = Math.min(elapsed / duration, 1);
          const eased = easingFunc(progress);
          
          const currentCommands = fromCommands.map((fromCmd, i) => {
              const toCmd = toCommands[i] || fromCmd;
              return interpolateCommands(fromCmd, toCmd, eased);
          });
          
          const newPath = buildPathFromCommands(currentCommands);
          pathElement.setAttribute('d', newPath);
          
          if (progress < 1) {
              requestAnimationFrame(update);
          } else {
              pathElement.setAttribute('d', toPath);
              resolve();
          }
      }
      
      requestAnimationFrame(update);
  });
}

function openProjectModal(project) {
  let projectSliderPosition = 1;

  document.querySelector('body').style.overflowY = 'hidden';

  let imagesHTML = '';

  for (let i = 0; i < project.images.length; i++) {
    imagesHTML += `
      <div class="slider-images__item${i == 0 ? ' active' : ''} ">
        <img src="uploads/${project.images[i]}" alt="">
      </div>
    `;
  }

  document.querySelector('.slider-images').innerHTML = imagesHTML;

  document.querySelector('.slider-open-image').innerHTML = `
    <div class="image-container">
      <img src="uploads/${project.images[0]}" alt="">
    </div>
    <div class="arrow left">
      <img src="img/modal-slider-arrow.svg" alt="">
    </div>
    <div class="arrow right active">
      <img src="img/modal-slider-arrow.svg" style="transform: scale(-1);" alt="">
    </div>
  `;

  const miniImages = document.querySelectorAll('.slider-images__item');

  for (let i = 0; i < miniImages.length; i++) {
    miniImages[i].addEventListener('click', () => {
      projectSliderPosition = i + 1;
      document.querySelector('.slider-open-image .image-container').innerHTML = `
        <img src="uploads/${project.images[projectSliderPosition - 1]}" alt="">
      `;
      if (projectSliderPosition >= project.images.length) {
        document.querySelectorAll('.slider-open-image .arrow')[1].classList.remove('active');
      } else {
        document.querySelectorAll('.slider-open-image .arrow')[1].classList.add('active');
      }
      if (projectSliderPosition <= 1) {
        document.querySelectorAll('.slider-open-image .arrow')[0].classList.remove('active');
      } else {
        document.querySelectorAll('.slider-open-image .arrow')[0].classList.add('active');
      }
      miniImages.forEach(img => {
        img.classList.remove('active');
      });
      miniImages[i].classList.add('active');
    });
  }

  document.querySelectorAll('.slider-open-image .arrow')[0].addEventListener('click', () => {
    if (projectSliderPosition > 1) {
      document.querySelectorAll('.slider-open-image .arrow')[1].classList.add('active');
      projectSliderPosition--;
      miniImages.forEach(img => {
        img.classList.remove('active');
      });
       miniImages[projectSliderPosition - 1].classList.add('active');
      document.querySelector('.slider-open-image .image-container').innerHTML = `
        <img src="uploads/${project.images[projectSliderPosition - 1]}" alt="">
      `;
      if (projectSliderPosition <= 1) {
        document.querySelectorAll('.slider-open-image .arrow')[0].classList.remove('active');
      }
    }
  });

  document.querySelectorAll('.slider-open-image .arrow')[1].addEventListener('click', () => {
    if (projectSliderPosition < project.images.length) {
      document.querySelectorAll('.slider-open-image .arrow')[0].classList.add('active');
      projectSliderPosition++;
      miniImages.forEach(img => {
        img.classList.remove('active');
      });
       miniImages[projectSliderPosition - 1].classList.add('active');
      document.querySelector('.slider-open-image .image-container').innerHTML = `
        <img src="uploads/${project.images[projectSliderPosition - 1]}" alt="">
      `;
      if (projectSliderPosition >= project.images.length) {
        document.querySelectorAll('.slider-open-image .arrow')[1].classList.remove('active');
      }
    }
  });

  document.querySelector('.slider-info .title').innerHTML = project.name;
  document.querySelector('.slider-info .comment').innerHTML = project.comment;

  const projectData = document.querySelectorAll('.data__value');

  projectData[0].innerHTML = `${formatArea(project.area)} м<sup>2</sup>`;
  projectData[1].innerHTML = getDayString(project.duration_days);
  projectData[2].innerHTML = project.renovation_type;

  document.querySelector('.project-modal').style.display = 'flex';
}

document.querySelector('.project-close').addEventListener('click', () => {
  document.querySelector('body').style.overflowY = 'scroll';
  document.querySelector('.project-modal').style.display = 'none';
});

document.querySelector('.project-modal').addEventListener('click', e => {
  if (e.target === document.querySelector('.project-modal')) {
    document.querySelector('body').style.overflowY = 'scroll';
    document.querySelector('.project-modal').style.display = 'none';
  }
});

const projectBlock = document.querySelector('.project-cards');

function renderProjects(currentProject, projectNumber) {
  let sliderPosition = 1;

  projectBlock.innerHTML = `
    <article class="project-cards__item">
      <div class="project-card__title">${currentProject.name}</div>
      <div class="project-card__comment">${currentProject.comment}</div>
      <div class="project-card__number">
        ${String(projectNumber).padStart(2, '0')}
      </div>
      <div class="project-card__controls">
        <button class="controls__arrow"><img src="img/slider-arrow-grey.png" alt=""></button>
        <div class="controls__progress">01 <span>/</span> ${String(currentProject.images.length).padStart(2, '0')}</div>
        <button class="controls__arrow active"><img src="img/slider-arrow-grey.png"  style="transform: scale(-1);" alt=""></button>
      </div>
      <div class="project-card__images">
        <div class="slider-image slider-image--previous"></div>
        <div class="slider-image slider-image--right">
          <img src="uploads/${currentProject.images[0]}" alt="">
        </div>
        <div class="slider-image slider-image--left">
          <img src="uploads/${currentProject.images[1]}" alt="">
        </div>
        <div class="slider-image slider-image--next">
          <img src="uploads/${currentProject.images[2]}" alt="">
        </div>
        <div class="slider-logo">
          <img src="img/logo-black.png" alt="">
        </div>
        <div class="slider-mobile__controls">
          <div class="slider-mobile__arrow left">
            <img src="img/modal-slider-arrow.svg" alt="">
          </div>
          <div class="slider-mobile__arrow right active">
            <img src="img/modal-slider-arrow.svg" style="transform: scale(-1);" alt="">
          </div>
        </div>
      </div>
    </article>
  `;

  document.querySelector('.projects-data__button').innerHTML = `
    <button>
      Открыть проект <span></span>
    </button>
  `;

  document.querySelector('.projects-data__button button').addEventListener('click', () => {
    openProjectModal(currentProject);
  });

  document.querySelector('.project-card__images').addEventListener('click', e => {
    const target = e.target.closest('div');
  
    if (target.classList.contains('slider-mobile__arrow') || 
        target.classList.contains('slider-logo') ||
        window.innerWidth > 1200) {
      return;
    }

    openProjectModal(currentProject);
  });

  const projectData = document.querySelectorAll('.projects-data__value');

  document.querySelectorAll('.projects-data__section').forEach(block => {
    block.style.opacity = '0';
  });

  document.querySelector('.projects-data__button').style.opacity = '0';

  projectData[0].innerHTML = `${formatArea(currentProject.area)} м<sup>2</sup>`;
  projectData[1].innerHTML = currentProject.renovation_type;
  projectData[2].innerHTML = getDayString(currentProject.duration_days);

  setTimeout(() => {
    document.querySelectorAll('.projects-data__section').forEach(block => {
      block.style.opacity = '1';
    });

    document.querySelector('.projects-data__button').style.opacity = '1';
  }, 70);

  function setImages(position, images, imageBlocks) {
    for (let i = 0; i < 4; i++) {
      if (images[position + (i - 2)]) {
        imageBlocks[i].innerHTML = `
          <img src="uploads/${images[position + (i - 2)]}" alt="">
        `;
      } else {
        imageBlocks[i].innerHTML = '';
      }
    }
  }

  const buttons = document.querySelectorAll('.controls__arrow');
  const buttonsMobile = document.querySelectorAll('.slider-mobile__arrow');
  const imageBlocks = document.querySelectorAll('.slider-image');
  const sliderProgress = document.querySelector('.controls__progress');
  const path2 = "M 0.314 0.089 Q 0.313 0.063 0.335 0.061 L 0.88 0.061 Q 0.895 0.063 0.893 0.082 L 0.871 0.737 Q 0.87 0.751 0.857 0.751 L 0.377 0.751 Q 0.358 0.751 0.356 0.729 Z";
  const path1 = "M 0.207 0.051 Q 0.219 0.002 0.269 0.001 L 0.8 0 Q 0.857 0.002 0.858 0.053 L 0.93 0.944 Q 0.935 1 0.876 1 L 0.065 1 Q 0 1.001 0.013 0.94 Z";
  let canClick = true;

  buttons[1].addEventListener('click', async function() {
    if (sliderPosition < currentProject.images.length && canClick) {
      canClick = false;
      sliderPosition++;
      sliderProgress.innerHTML = `
        ${String(sliderPosition).padStart(2, '0')} <span>/</span> ${String(currentProject.images.length).padStart(2, '0')}
      `;
      buttons[0].classList.add('active');
      if (sliderPosition >= currentProject.images.length) {
        buttons[1].classList.remove('active');
      }
      imageBlocks[1].style.transition = 'opacity 250ms ease, right 250ms ease';
      imageBlocks[1].style.right = '570px';
      imageBlocks[1].style.opacity = '0';
      setTimeout(() => {
        imageBlocks[2].style.transition = 'right 250ms ease';
        imageBlocks[2].style.right = '285px';
        imageBlocks[3].style.transition = 'opacity 250ms ease, right 250ms ease';
        imageBlocks[3].style.right = '-10px';
        imageBlocks[3].style.opacity = '1';
        animateClipPath(path2, path1, 250, 'clipPath2');
        setTimeout(() => {
          animateClipPath(path1, path2, 0, 'clipPath2');
          imageBlocks[1].style.transition = 'none';
          imageBlocks[1].style.right = '285px';
          imageBlocks[1].style.opacity = '1';
          imageBlocks[2].style.transition = 'none';
          imageBlocks[2].style.right = '-10px';
          imageBlocks[3].style.transition = 'none';
          imageBlocks[3].style.right = '-200px';
          imageBlocks[3].style.opacity = '0';
          setImages(sliderPosition, currentProject.images, imageBlocks);
          canClick = true;
        }, 250);
      }, 90);
    }
  });

  buttons[0].addEventListener('click', () => {
    if (sliderPosition > 1 && canClick) {
      canClick = false;
      sliderPosition--;
      sliderProgress.innerHTML = `
        ${String(sliderPosition).padStart(2, '0')} <span>/</span> ${String(currentProject.images.length).padStart(2, '0')}
      `;
      buttons[1].classList.add('active');
      if (sliderPosition <= 1) {
        buttons[0].classList.remove('active');
      }
      imageBlocks[2].style.transition = 'opacity 250ms ease, right 250ms ease';
      imageBlocks[2].style.right = '-200px';
      imageBlocks[2].style.opacity = '0';
      animateClipPath(path1, path2, 250, 'clipPath1');
      setTimeout(() => {
        imageBlocks[0].style.transition = 'opacity 250ms ease, right 250ms ease';
        imageBlocks[0].style.right = '285px';
        imageBlocks[0].style.opacity = '1';
        imageBlocks[1].style.transition = 'right 250ms ease';
        imageBlocks[1].style.right = '-10px';
        setTimeout(() => {
          animateClipPath(path2, path1, 0, 'clipPath1');
          imageBlocks[0].style.transition = 'none';
          imageBlocks[0].style.right = '570px';
          imageBlocks[0].style.opacity = '0';
          imageBlocks[1].style.transition = 'none';
          imageBlocks[1].style.right = '285px';
          imageBlocks[2].style.transition = 'none';
          imageBlocks[2].style.right = '-10px';
          imageBlocks[2].style.opacity = '1';
          setImages(sliderPosition, currentProject.images, imageBlocks);
          canClick = true;
        }, 250);
      }, 90);
    }
  });

  function mobileSliderRight () {
    if (sliderPosition < currentProject.images.length && canClick) {
      canClick = false;
      sliderPosition++;
      buttonsMobile[0].classList.add('active');
      if (sliderPosition >= currentProject.images.length) {
        buttonsMobile[1].classList.remove('active');
      }
      imageBlocks[1].style.transition = 'opacity 250ms ease, right 250ms ease';
      imageBlocks[1].style.right = '62vw';
      imageBlocks[1].style.opacity = '0';
      setTimeout(() => {
        imageBlocks[2].style.transition = 'all 250ms ease';
        imageBlocks[2].style.right = '38vw';
        imageBlocks[2].style.width = '55vw';
        imageBlocks[2].style.height = '71vw';
        imageBlocks[3].style.transition = 'opacity 250ms ease, right 250ms ease';
        imageBlocks[3].style.right = '0';
        imageBlocks[3].style.opacity = '1';
        setTimeout(() => {
          imageBlocks[1].style.transition = 'none';
          imageBlocks[1].style.right = '38vw';
          imageBlocks[1].style.opacity = '1';
          imageBlocks[2].style.transition = 'none';
          imageBlocks[2].style.right = '0';
          imageBlocks[2].style.width = '34.5vw';
          imageBlocks[2].style.height = '45vw';
          imageBlocks[3].style.transition = 'none';
          imageBlocks[3].style.right = '-20vw';
          imageBlocks[3].style.opacity = '0';
          setImages(sliderPosition, currentProject.images, imageBlocks);
          canClick = true;
        }, 250);
      }, 90);
    }
  }

  function mobileSliderLeft () {
    if (sliderPosition > 1 && canClick) {
      canClick = false;
      sliderPosition--;
      buttonsMobile[1].classList.add('active');
      if (sliderPosition <= 1) {
        buttonsMobile[0].classList.remove('active');
      }
      imageBlocks[2].style.transition = 'opacity 250ms ease, right 250ms ease';
      imageBlocks[2].style.right = '-20vw';
      imageBlocks[2].style.opacity = '0';
      setTimeout(() => {
        imageBlocks[0].style.transition = 'opacity 250ms ease, right 250ms ease';
        imageBlocks[0].style.right = '38vw';
        imageBlocks[0].style.opacity = '1';
        imageBlocks[1].style.transition = 'all 250ms ease';
        imageBlocks[1].style.right = '0';
        imageBlocks[1].style.width = '34.5vw';
        imageBlocks[1].style.height = '45vw';
        setTimeout(() => {
          imageBlocks[0].style.transition = 'none';
          imageBlocks[0].style.right = '62vw';
          imageBlocks[0].style.opacity = '0';
          imageBlocks[1].style.transition = 'none';
          imageBlocks[1].style.right = '38vw';
          imageBlocks[1].style.width = '55vw';
          imageBlocks[1].style.height = '71vw';
          imageBlocks[2].style.transition = 'none';
          imageBlocks[2].style.right = '0';
          imageBlocks[2].style.opacity = '1';
          setImages(sliderPosition, currentProject.images, imageBlocks);
          canClick = true;
        }, 250);
      }, 90);
    }
  }

  buttonsMobile[1].addEventListener('click', () => {
    mobileSliderRight();
  });

  buttonsMobile[0].addEventListener('click', () => {
    mobileSliderLeft();
  });

  if (window.innerWidth <= 1200) {
    let startX = 0;

    document.querySelector('.project-card__images').addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
    });

    document.querySelector('.project-card__images').addEventListener('touchend', (e) => {
      const diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) mobileSliderRight();
        else mobileSliderLeft();
      }
    });
  }
}
 
async function loadProjects() {
    try {
        const response = await fetch('/api/projects');
        if (!response.ok) {
            throw new Error('Ошибка загрузки проектов');
        }
        projects = await response.json();
        projects.reverse();
        renderProjects(projects[0], 1);

        const sliderArrows = document.querySelectorAll('.slider__arrow');

        let projectNumber = 1;

        sliderArrows[0].addEventListener('click', () => {
          if (projectNumber > 1) {
            projectNumber--;
            if (projectNumber <= 1) {
              sliderArrows[0].classList.remove('active');
              sliderArrows[0].innerHTML = '<img src="img/slider-arrow-disabled.svg" alt="">';
            }
            sliderArrows[1].classList.add('active');
            sliderArrows[1].innerHTML = '<img src="img/slider-arrow.svg" style="transform: scale(-1);" alt="">';
            const projectCard = document.querySelector('.project-cards__item');
            projectCard.style.opacity = '0';
            projectCard.style.transform = 'translateX(-300px)';
            setTimeout(() => {
              renderProjects(projects[projectNumber - 1], projectNumber);
            }, 200);
          }
        });

        sliderArrows[1].addEventListener('click', () => {
          if (projectNumber < projects.length) {
            projectNumber++;
            if (projectNumber >= projects.length) {
              sliderArrows[1].classList.remove('active');
              sliderArrows[1].innerHTML = '<img src="img/slider-arrow-disabled.svg" style="transform: scale(-1);" alt="">';
            }
            sliderArrows[0].classList.add('active');
            sliderArrows[0].innerHTML = '<img src="img/slider-arrow.svg" alt="">';
            const projectCard = document.querySelector('.project-cards__item');
            projectCard.style.opacity = '0';
            projectCard.style.transform = 'translateX(300px)';
            setTimeout(() => {
              renderProjects(projects[projectNumber - 1], projectNumber);
            }, 200);
          }
        });
    } catch (error) {
        console.error('Ошибка:', error);
    }
}

loadProjects();

document.getElementById('requestForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const formData = new FormData(this);
  const data = {
      client_name: formData.get('client_name'),
      client_email: formData.get('client_email'),
      client_phone: formData.get('client_phone'),
      request_type: formData.get('request_type'),
      client_comment: formData.get('client_comment') || '',
      client_uuid: userId
  };
  try {
      const response = await fetch('/api/requests', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
      });
      
      const result = await response.json();
      
      if (response.ok) {
          document.querySelector('.form__input-block input').value = '';
          document.querySelector('#page-form__phone').value = '';
          document.querySelector('.request-form').style.opacity = '0.6';
          setTimeout(() => {
            document.querySelector('.request-form').style.opacity = '1';
            document.querySelector('.form-success').style.display = 'block';
          }, 800);
      } else {
          console.error('Ошибка: ' + result.error);
          document.querySelector('.form__input-block input').value = '';
          document.querySelector('#page-form__phone').value = '';
          document.querySelector('.form-modal').style.display = 'none';
      }
  } catch (error) {
      console.error('Ошибка при отправке заявки:', error);
  }
});