// ШАПКА:
let modalRole = null;

const burger = document.querySelector('.burger');
const header = document.querySelector('header');

burger.addEventListener('click', () => {
    header.classList.toggle('active');
    burger.classList.toggle('is-active');
});

const navItems = document.querySelectorAll('.admin-nav__item');
const tabs = document.querySelectorAll('.tab');

function switchTab(index) {
    navItems.forEach(item => item.classList.remove('active'));
    tabs.forEach(tab => tab.classList.remove('active'));
    navItems[index].classList.add('active');
    tabs[index].classList.add('active');
    header.classList.remove('active');
    burger.classList.remove('is-active');
}

document.querySelector('.admin-nav').addEventListener('click', function(e) {
    const item = e.target.closest('.admin-nav__item');
    if (!item) return;
    
    const index = Array.from(navItems).indexOf(item);
    if (index !== -1) {
        switchTab(index);
    }
});

switchTab(0);

// ЗАЯВКИ:
let currentCardId = null;

function formatDate(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} <span>${hours}:${minutes}</span>`;
}

function getRequestTypeData(type) {
    if (type === 'Заявка на ремонт') {
        return { class: 'repair', text: 'Заявка на ремонт' };
    } else if (type === 'Заявка на дизайн-проект') {
        return { class: 'designproject', text: 'Заявка на дизайн-проект' };
    }
    return { class: '', text: type };
}


function initCardHandlers() {
    const cards = document.querySelectorAll('.request-card');
    
    cards.forEach(card => {
        const fullHeight = card.scrollHeight;
        card.style.height = '74px';
        const cardId = card.dataset.id;
        const wrapper = card.closest('.card_wrapper');
        const newBadge = wrapper?.querySelector('.new');
        
        let isViewed = !newBadge;
        
        card.addEventListener('click', async function(e) {
            const rect = this.getBoundingClientRect();
            const clickY = e.clientY - rect.top;
            
            if (clickY <= 74) {
                const isActive = this.classList.contains('active');
                
                if (!isViewed && !isActive) {
                    try {
                        const response = await fetch(`/api/requests/${cardId}/view`, {
                            method: 'PUT'
                        });
                        
                        if (response.ok) {
                            isViewed = true;
                            if (newBadge) {
                                newBadge.remove();
                            }
                        }
                    } catch (error) {
                        console.error('Ошибка при обновлении статуса:', error);
                    }
                }
                
                if (isActive) {
                    this.style.height = '74px';
                    this.classList.remove('active');
                } else {
                    this.classList.add('active');
                    requestAnimationFrame(() => {
                        this.style.height = this.scrollHeight + 'px';
                    });
                }
            }
        });
    });

    const deleteButtons = document.querySelectorAll('.request-card__delete');

    deleteButtons.forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            currentCardId = btn.dataset.id;
            document.querySelector('.modal').style.display = 'flex';
            document.querySelector('.modal-window__text').innerHTML = `
                Вы уверены что хотите удалить заявку пользователя: "${btn.dataset.username}"?
            `;
            modalRole = 'delete request';
        })
    });
}

async function loadRequests() {
    try {
        const response = await fetch('/api/requests');
        const requests = await response.json();
        
        const container = document.querySelector('.requests-list');
        container.innerHTML = '';

        if (requests.length != 0) {
            requests.forEach(request => {
                const typeData = getRequestTypeData(request.request_type);
                const formattedDate = formatDate(request.created_at);
                const shortUUID = request.client_uuid.slice(0, 8) + '...';
                
                const cardWrapper = document.createElement('div');
                cardWrapper.className = 'card_wrapper';
                cardWrapper.dataset.id = request.id;
                
                cardWrapper.innerHTML = `
                    <div class="request-card" data-id="${request.id}">
                        <div class="request-card__header">
                            <div class="request-card__section">
                                <div class="request-card__col">
                                    <div class="request-card__arrow">
                                        <img src="img/arrow.svg" alt="">
                                    </div>
                                </div>
                                <div class="request-card__col">
                                    <div class="request-card__title ${typeData.class}">${typeData.text}</div>
                                    <div class="request-card__text">${request.client_name}</div>
                                </div>
                            </div>
                            <div class="request-card__section">
                                <div class="request-card__col">
                                    <a href="tel:${request.client_phone}" target="_blank">
                                        <div class="request-card__button">Позвонить</div>
                                    </a>
                                </div>
                                <div class="request-card__col">
                                    <div class="request-card__delete" data-id="${request.id}" data-username="${request.client_name}">
                                        Удалить
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="request-card__info">
                            <hr>
                            <div class="request-card__label">Комментарий клиента:</div>
                            <div class="request-card__text">${request.client_comment || 'Нет комментария'}</div>
                            <div class="request-card__data">
                                <div class="request-card__data--section">
                                    ${request.client_name}
                                </div>
                                <div class="request-card__data--section">
                                    ${request.client_email}
                                </div>
                                <div class="request-card__data--section">
                                    ${request.client_phone}
                                </div>
                                <div class="request-card__data--section">
                                    UUID: ${shortUUID}
                                </div>
                                <div class="request-card__data--section">
                                    ${formattedDate}
                                </div>
                            </div>
                            <div class="request-card__section--mob">
                                <div class="request-card__col">
                                    <a href="tel:${request.client_phone}" target="_blank">
                                        <div class="request-card__button">Позвонить</div>
                                    </a>
                                </div>
                                <div class="request-card__col">
                                    <div class="request-card__delete" data-id="${request.id}" data-username="${request.client_name}">
                                        Удалить
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    ${request.is_viewed ? '' : '<div class="new">новое</div>'}
                `;
                
                container.appendChild(cardWrapper);
            });
            
            initCardHandlers();
        } else {
            container.innerHTML = '<div class="norequests">Заявок нет</div>';
        }
        
    } catch (error) {
        console.error('Ошибка при загрузке заявок:', error);
    }
}

document.addEventListener('DOMContentLoaded', loadRequests);

// ПРОЕКТЫ:
let projects = [];
let currentProjectId = null;

function formatArea(area) {
    const num = parseFloat(area);

    if (Number.isInteger(num)) {
        return num.toString();
    }

    return num.toString();
}

function renderFullProject(id) {
    document.querySelector('.projectsmanagement-wrapper').scrollTop = 0;
    const fullProject = document.querySelector('.full-project');

    fullProject.style.display = 'block';
    document.querySelector('.add-project').style.display = 'none';
    document.querySelector('.projects-list').style.display = 'none';

    const project = projects.find(p => p.id === id);

    let imagesHTML = '';

    project.images.forEach(img => {
        imagesHTML += `
            <div class="img">
                <a href="/uploads/${img}" target="_blank"><img src="/uploads/${img}" alt=""></a>
            </div>
        `;
    });

    fullProject.innerHTML = `
        <div class="back">Назад</div>
            <div class="project__name">${project.name}</div>
            <div class="project__data">
                <div class="project__data--section">
                    <span class="title">Площадь</span>
                    <span class="text">${formatArea(project.area)} м<sup>2</sup></span>
                </div>
                <div class="project__data--section">
                    <span class="title">Тип</span>
                    <span class="text">${project.renovation_type}</span>
                </div>
                <div class="project__data--section">
                    <span class="title">Срок</span>
                    <span class="text">${project.duration_days} дней</span>
                </div>
            </div>
            <div class="project__data--section">
                <span class="title">Комментарий</span>
                <div class="project__comment">
                    ${project.comment}
                </div>
            </div>
            <div class="project__data--section">
                <span class="title">Картинки</span>
                <div class="full-project__images">
                    ${imagesHTML}
                </div>
            </div>
            <div class="flex">
                <div class="back">Назад</div>
                <div class="delete">Удалить проект</div>
            </div>
    `;

    document.querySelectorAll('.back').forEach(btn => {
        btn.addEventListener('click', () => {
            renderProjectCards(projects);
        });
    });

    document.querySelector('.delete').addEventListener('click', () => {
        currentProjectId = id;
        document.querySelector('.modal').style.display = 'flex';
        document.querySelector('.modal-window__text').innerHTML = `
            Вы уверены что хотите удалить проект ${project.name} ?
        `;
        modalRole = 'delete project';
    });
}

function renderProjectCards(projectsArray) {
    const projectsList = document.querySelector('.projects-list');
    document.querySelector('.projectsmanagement-wrapper').scrollTop = 0;

    projectsList.style.display = 'block';
    document.querySelector('.add-project').style.display = 'block';
    document.querySelector('.full-project').style.display = 'none';
    document.querySelector('.new-project').style.display = 'none';
    
    if (!projectsArray || projectsArray.length === 0) {
        projectsList.innerHTML = '<p style="text-align: center; padding: 40px;">Проектов пока нет</p>';
        return;
    }
    
    projectsList.innerHTML = '';
    
    projectsArray.forEach(project => {
        const firstImage = project.images && project.images.length > 0 
            ? project.images[0] 
            : 'img/default-project.jpg';
        let commentText = project.comment || 'Нет комментария';
        if (commentText.length > 50) {
            commentText = commentText.substring(0, 200) + '...';
        }
        
        const cardHTML = `
            <div class="project" data-project-id="${project.id}">
                <div class="project__img">
                    <img src="/uploads/${firstImage}" alt="${project.name}" loading="lazy">
                </div>
                <div class="project__info">
                    <div class="project__name">${project.name}</div>
                    <div class="project__data">
                        <div class="project__data--section">
                            <span class="title">Площадь</span>
                            <span class="text">${formatArea(project.area)} м<sup>2</sup></span>
                        </div>
                        <div class="project__data--section">
                            <span class="title">Тип</span>
                            <span class="text">${project.renovation_type}</span>
                        </div>
                        <div class="project__data--section">
                            <span class="title">Срок</span>
                            <span class="text">${project.duration_days} дней</span>
                        </div>
                    </div>
                    <div class="project__comment">${commentText}</div>
                    <div class="project__button">
                        <button data-project-id="${project.id}">Открыть</button>
                    </div>
                </div>
            </div>
        `;
        
        projectsList.insertAdjacentHTML('beforeend', cardHTML);
    });
    
    document.querySelectorAll('.project__button button').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const projectId = parseInt(this.dataset.projectId);
            renderFullProject(projectId);
        });
    });
}

async function loadProjects() {
    try {
        const response = await fetch('/api/projects');
        if (!response.ok) {
            throw new Error('Ошибка загрузки проектов');
        }
        projects = await response.json();
        renderProjectCards(projects);
    } catch (error) {
        console.error('Ошибка:', error);
        document.querySelector('.projects-list').innerHTML = 
            '<p style="text-align: center; padding: 40px;">Ошибка загрузки проектов</p>';
    }
}

document.addEventListener('DOMContentLoaded', loadProjects);

document.querySelector('.add-project').addEventListener('click', () => {
    const newProject = document.querySelector('.new-project');

    newProject.style.display = 'block';
    document.querySelector('.projects-list').style.display = 'none';
    document.querySelector('.add-project').style.display = 'none';

    document.querySelectorAll('.back').forEach(btn => {
        btn.addEventListener('click', () => {
            renderProjectCards(projects);
        });
    });
});

let selectedFiles = [];

document.addEventListener('DOMContentLoaded', function() {
    initAddProjectForm();
});

function initAddProjectForm() {
    const formContainer = document.querySelector('.add-project-page');
    const oldForm = document.getElementById('addProjectForm');
    
    if (oldForm) {
        oldForm.remove();
    }

    const formHTML = `
        <form id="addProjectForm" class="add-project-form">
            <div class="form-group">
                <label for="projectName" class="form-label">Название проекта *</label>
                <input type="text" id="projectName" class="form-input" placeholder="Например: Кофейня 'Black Fox' на ул. Ленина" required>
            </div>
            <div class="form-flex">
                <div class="form-group">
                    <label for="projectArea" class="form-label">Площадь (м²) *</label>
                    <input type="number" id="projectArea" class="form-input" placeholder="Например: 17" step="0.01" min="0.01" required>
                </div>
                <div class="form-group">
                    <label for="projectType" class="form-label">Тип ремонта *</label>
                    <select id="projectType" class="form-select" required>
                        <option value="">Выберите тип</option>
                        <option value="Косметический">Косметический</option>
                        <option value="Капитальный">Капитальный</option>
                        <option value="Дизайнерский">Дизайнерский</option>
                        <option value="Премиальный">Премиальный</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="projectDuration" class="form-label">Срок (дней) *</label>
                    <input type="number" id="projectDuration" class="form-input" placeholder="Например: 75" min="1" required>
                </div>
            </div>
            <div class="form-group">
                <label for="projectComment" class="form-label">Комментарий</label>
                <textarea id="projectComment" class="form-textarea" placeholder="Дополнительная информация о проекте..." rows="4"></textarea>
            </div>
            <div class="form-group">
                <label class="form-label">Изображения проекта</label>
                <div id="dropZone" class="drop-zone">
                    <div class="drop-zone__content">
                        <div class="drop-zone__icon">📁</div>
                        <div class="drop-zone__text">Перетащите файлы сюда или <span class="drop-zone__link">выберите на компьютере</span></div>
                        <div class="drop-zone__hint">Поддерживаются JPG, PNG. Максимум 100 файлов</div>
                    </div>
                    <input type="file" id="fileInput" class="drop-zone__input" accept="image/*" multiple>
                </div>
                <div id="imagePreviewList" class="image-preview-list"></div>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Создать проект</button>
            </div>
        </form>
    `;

    formContainer.insertAdjacentHTML('beforeend', formHTML);

    const form = document.getElementById('addProjectForm');
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const previewList = document.getElementById('imagePreviewList');

    selectedFiles = [];

    dropZone.addEventListener('click', function(e) {
        if (e.target === dropZone || e.target.closest('.drop-zone__content')) {
            fileInput.click();
        }
    });

    fileInput.addEventListener('change', function(e) {
        handleFiles(this.files);
        this.value = '';
    });

    dropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        this.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        const formData = new FormData();
        formData.append('name', document.getElementById('projectName').value.trim());
        formData.append('area', document.getElementById('projectArea').value);
        formData.append('renovation_type', document.getElementById('projectType').value);
        formData.append('duration_days', document.getElementById('projectDuration').value);
        formData.append('comment', document.getElementById('projectComment').value.trim());

        selectedFiles.forEach(file => {
            formData.append('images', file);
        });

        try {
            const submitBtn = document.querySelector('.btn-primary');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Создание...';
            submitBtn.disabled = true;

            const response = await fetch('/api/projects', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (!response.ok) {
                if (result.details) {
                    throw new Error(result.details.join('\n'));
                }
                throw new Error(result.error || 'Ошибка создания проекта');
            } else {
                submitBtn.textContent = originalText;
                selectedFiles = [];
                previewList.innerHTML = '';
                console.log('Проект создан:', result.project);
                alert('Проект создан!');
                document.querySelector('.projectsmanagement-wrapper').style.opacity = '0.5';
                setTimeout(() => {
                    document.querySelector('.projectsmanagement-wrapper').style.opacity = '1';
                    initAddProjectForm();
                    loadProjects();
                }, 500);
            }
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Ошибка: ' + error.message);
            
            const submitBtn = document.querySelector('.btn-primary');
            submitBtn.textContent = 'Создать проект';
            submitBtn.disabled = false;
        }
    });

    function handleFiles(files) {
        const maxFiles = 100;
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        const maxSize = 5 * 1024 * 1024;
        const totalFiles = selectedFiles.length + files.length;
        if (totalFiles > maxFiles) {
            alert(`Можно загрузить не более ${maxFiles} файлов`);
            return;
        }

        for (let file of files) {
            if (!allowedTypes.includes(file.type)) {
                alert(`Файл "${file.name}" имеет неподдерживаемый формат. Разрешены: JPG, PNG, WebP`);
                continue;
            }

            if (file.size > maxSize) {
                alert(`Файл "${file.name}" превышает 5MB`);
                continue;
            }

            const isDuplicate = selectedFiles.some(f => 
                f.name === file.name && f.size === file.size
            );
            if (isDuplicate) {
                alert(`Файл "${file.name}" уже добавлен`);
                continue;
            }

            selectedFiles.push(file);
        }

        updatePreview();
    }

    function updatePreview() {
        previewList.innerHTML = '';

        if (selectedFiles.length === 0) {
            return;
        }

        selectedFiles.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const item = document.createElement('div');
                item.className = 'image-preview-item';
                item.innerHTML = `
                    <img src="${e.target.result}" alt="${file.name}" class="image-preview-item__thumb">
                    <div class="image-preview-item__info">
                        <div class="image-preview-item__name">${formatFileName(file.name)}</div>
                        <div class="image-preview-item__size">${formatFileSize(file.size, 15)}</div>
                    </div>
                    <button type="button" class="image-preview-item__remove" data-index="${index}">×</button>
                `;

                const removeBtn = item.querySelector('.image-preview-item__remove');
                removeBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const idx = parseInt(this.dataset.index);
                    removeFile(idx);
                });

                previewList.appendChild(item);
            };
            reader.readAsDataURL(file);
        });
    }

    function removeFile(index) {
        selectedFiles.splice(index, 1);
        updatePreview();
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function formatFileName(filename, maxLength = 25) {
        if (filename.length <= maxLength) return filename;
        
        const ext = filename.includes('.') ? filename.substring(filename.lastIndexOf('.')) : '';
        const name = filename.substring(0, filename.length - ext.length);
        const maxNameLen = maxLength - ext.length - 5;
        
        if (maxNameLen <= 3) return filename.substring(0, maxLength - 3) + '...' + ext;
        
        const half = Math.floor(maxNameLen / 2);
        return name.substring(0, half) + ' ... ' + name.substring(name.length - (maxNameLen - half)) + ext;
    }

    function validateForm() {
        const name = document.getElementById('projectName').value.trim();
        const area = document.getElementById('projectArea').value;
        const type = document.getElementById('projectType').value;
        const duration = document.getElementById('projectDuration').value;

        if (!name) {
            alert('Введите название проекта');
            document.getElementById('projectName').focus();
            return false;
        }

        if (!area || parseFloat(area) <= 0) {
            alert('Введите корректную площадь');
            document.getElementById('projectArea').focus();
            return false;
        }

        if (!type) {
            alert('Выберите тип ремонта');
            document.getElementById('projectType').focus();
            return false;
        }

        if (!duration || parseInt(duration) < 1) {
            alert('Введите корректный срок');
            document.getElementById('projectDuration').focus();
            return false;
        }

        if (selectedFiles.length === 0) {
            alert('Добавьте хотя бы одну картинку');
            return false;
        }

        return true;
    }
}

// ЧАТЫ:
let currentUserId = null;
const socket = io({
  withCredentials: true
});

function escapeHTML(str) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;'
    };
    return str.replace(/[&<>"'/]/g, function(s) {
        return map[s];
    });
}

function loadChats() {
    fetch('/api/chats')
        .then(res => res.json())
        .then(chats => {
            const container = document.getElementById('chats-container');
            container.innerHTML = '';
            
            if (chats.length === 0) {
                container.innerHTML = '<div style="color:#999;padding:10px;">Нет чатов</div>';
                return;
            }
            
            chats.forEach(chat => {
                const div = document.createElement('div');
                div.className = 'chat-item';
                if (currentUserId === chat.user_id) {
                    div.classList.add('active');
                }
                
                const shortId = chat.user_id.slice(0, 8);
                let lastMsg = chat.last_message || 'Нет сообщений';
                if (lastMsg.length > 70) {
                    lastMsg = lastMsg.slice(0, 70) + '...';
                }
                const date = new Date(chat.last_message_time);
                const timeStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
                
                div.innerHTML = `
                    <div class="user-id">${shortId}</div>
                    <div class="last-msg">${escapeHTML(lastMsg)}</div>
                    <div class="time">${timeStr}</div>
                `;
                
                div.onclick = () => openChat(chat.user_id);
                container.appendChild(div);
            });
        })
        .catch(err => console.error('Ошибка загрузки чатов:', err));
}

function openChat(userId) {
    currentUserId = userId;
    document.getElementById('chat-header__text').textContent = `Чат: ${userId.slice(0, 8)}...`;
    document.getElementById('chat-header__button').style.display = 'block';
    document.getElementById('input-area').style.display = 'flex';
    document.getElementById('messages').innerHTML = '';
    document.getElementById('chat-area').classList.add('active');
    if (window.screen.width < 825) {
        document.getElementById('chat-list').style.height = '0';
    }
    
    fetch(`/api/messages/${userId}`)
        .then(res => res.json())
        .then(messages => {
            messages.forEach(msg => {
                renderMessage(msg.sender_type, msg.text, new Date(msg.created_at).toLocaleDateString() + ' ' + new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));
            });
        })
        .catch(err => console.error('Ошибка загрузки сообщений:', err));
    
    socket.off('new_user_message');
    socket.off('new_admin_message_admin');
    
    socket.on('new_user_message', (data) => {
        if (data.userId === currentUserId) {
            renderMessage('user', data.text, new Date(data.timestamp).toLocaleDateString() + ' ' +new Date(data.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));
            loadChats();
        } else {
            loadChats();
        }
    });
    
    socket.on('new_admin_message_admin', (data) => {
        if (data.userId === currentUserId) {
            renderMessage('admin', data.text, new Date(data.created_at).toLocaleDateString() + ' ' + new Date(data.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));
            loadChats();
        }
    });
    
    loadChats();
}

function renderMessage(senderType, text, time) {
    const container = document.getElementById('messages');
    const body = document.querySelector('body');
    
    const noChatMsg = document.getElementById('no-chat-selected');
    if (noChatMsg) noChatMsg.remove();
    
    const div = document.createElement('div');
    div.className = `msg ${senderType}`;
    
    const senderLabel = senderType === 'user' ? 'Пользователь' : 'Вы';
    div.innerHTML = `
        <div class="sender">${senderLabel}</div>
        <div class="text">${escapeHTML(text)}</div>
        <div class="time">${time}</div>
    `;
    
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    body.scrollTop = 0;
}

document.getElementById('reply-btn').addEventListener('click', () => {
    const input = document.getElementById('reply-input');
    const text = input.value.trim();
    
    if (!text) return;
    if (!currentUserId) {
        alert('Сначала выберите чат');
        return;
    }

    socket.emit('admin_reply', {
        userId: currentUserId,
        text: text
    });

    renderMessage('admin', text, new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));
    loadChats();
    input.value = '';
});

document.getElementById('reply-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('reply-btn').click();
    }
});

socket.on('connect', () => {
    console.log('Админ подключен к socket.io');
    socket.emit('admin_join');
});

socket.on('new_admin_message_admin', (data) => {
  if (data.userId === currentUserId) {
    renderMessage('admin', data.text, new Date(data.created_at).toLocaleDateString() + ' ' + new Date(data.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));
    loadChats();
  }
});

loadChats();

document.getElementById('chat-header__button').addEventListener('click', () => {
    document.querySelector('.modal').style.display = 'flex';
    document.querySelector('.modal-window__text').innerHTML = `
        Вы уверены что хотите удалить чат с ${currentUserId.slice(0, 8)}... ?
    `;
    modalRole = 'delete chat';
});

document.getElementById('chat-arrow').addEventListener('click', () => {
    document.getElementById('chat-area').classList.remove('active');
    if (window.screen.width < 825) {
        document.getElementById('chat-list').style.height = 'auto';
    }
});

document.querySelector('.modal-btn.yes').addEventListener('click', async () => {
    if (modalRole == 'delete chat') {
        try {
            const response = await fetch(`/api/chats/${currentUserId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                document.querySelector('.modal').style.display = 'none';
                loadChats();
                document.getElementById('chat-header__text').textContent = `Выберите чат слева`;
                document.getElementById('chat-header__button').style.display = 'none';
                document.getElementById('input-area').style.display = 'none';
                document.getElementById('messages').innerHTML = '<div id="no-chat-selected">👈 Нажмите на чат, чтобы открыть</div>';
            } else {
                document.querySelector('.modal').style.display = 'none';
                const data = await response.json();
                alert(`Ошибка: ${data.error || 'Не удалось удалить чат'}`);
            }
        } catch (error) {
            document.querySelector('.modal').style.display = 'none';
            console.error('Ошибка при удалении чата:', error);
            alert('Произошла ошибка при удалении чата. Попробуйте позже.');
        }
    } else
    if (modalRole == 'delete request') {
        try {
            const response = await fetch(`/api/requests/${currentCardId}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (response.ok) {
                document.querySelector('.modal').style.display = 'none';
                loadRequests();
            } else {
                document.querySelector('.modal').style.display = 'none';
                console.error('Ошибка:', result.error);
                alert('Произошла ошибка при удалении заявки. Попробуйте позже.');
            }
        } catch (error) {
            document.querySelector('.modal').style.display = 'none';
            console.error('Ошибка при удалении:', error);
            alert('Произошла ошибка при удалении заявки. Попробуйте позже.');
        }
    }
    else
    if (modalRole == 'delete project') {
        const response = await fetch(`/api/projects/${currentProjectId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (response.ok) {
            document.querySelector('.modal').style.display = 'none';
            loadProjects();
        } else {
            throw new Error(result.error || 'Ошибка при удалении проекта');
        }
    }
});

document.querySelector('.modal-btn.no').addEventListener('click', () => {
    document.querySelector('.modal').style.display = 'none';
})