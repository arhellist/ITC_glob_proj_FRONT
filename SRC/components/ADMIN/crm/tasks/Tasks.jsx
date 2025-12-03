import React, { useState, useEffect, useCallback } from 'react';
import axiosAPI from '../../../../JS/auth/http/axios';
import CreateTaskModal from './CreateTaskModal';
import TaskDetailsModal from './TaskDetailsModal';
import TaskCard from './TaskCard';
import { isTaskOverdueInManagerTimezone } from '../../../../utils/timezone-utils';
import './Tasks.css';

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showTaskDetails, setShowTaskDetails] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [currentManagerGeography, setCurrentManagerGeography] = useState('Россия, Москва');

  // Загрузка информации о текущем менеджере
  const loadManagerInfo = useCallback(async () => {
    try {
      const response = await axiosAPI.get('/admin/profile');
      if (response.data.success && response.data.admin?.geography) {
        setCurrentManagerGeography(response.data.admin.geography);
        console.log('🔍 Местоположение менеджера:', response.data.admin.geography);
      }
    } catch (error) {
      console.error('Ошибка загрузки информации о менеджере:', error);
    }
  }, []);

  // Загрузка всех задач менеджера
  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosAPI.get('/admin/tasks/all');
      console.log('🔍 Загруженные задачи:', response.data);
      const tasksData = response.data.data || [];
      console.log('🔍 Детали задач:', tasksData.map(task => ({ id: task.id, title: task.title, status: task.status })));
      setTasks(tasksData);
    } catch (error) {
      console.error('Ошибка загрузки задач:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadManagerInfo();
    loadTasks();
  }, [loadManagerInfo, loadTasks]);

  // Периодическая перезагрузка задач для обновления статусов (каждые 10 минут)
  useEffect(() => {
    const interval = setInterval(() => {
      loadTasks();
    }, 600000); // 10 минут

    return () => clearInterval(interval);
  }, [loadTasks]);

  // ПРОСТОЙ drag-and-drop для задач (как в разделе ПРОДАЖИ)
  const handleDragStart = (e, taskId) => {
    // Проверяем, что taskId валидный
    if (!taskId || isNaN(parseInt(taskId))) {
      console.error(`❌ Невалидный taskId в handleDragStart: ${taskId}`);
      e.preventDefault();
      return;
    }
    
    e.dataTransfer.setData('text/plain', taskId.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    
    if (!taskId) {
      console.error(`❌ Пустой taskId в handleDrop`);
      return;
    }
    
    // Проверяем, что taskId валидный
    const parsedTaskId = parseInt(taskId);
    if (isNaN(parsedTaskId) || parsedTaskId <= 0) {
      console.error(`❌ Невалидный taskId в handleDrop: ${taskId} -> ${parsedTaskId}`);
      return;
    }

    // Находим задачу и проверяем, не в том ли статусе она уже
    const task = tasks.find(t => t.id === parsedTaskId);
    if (!task || task.status === targetStatus) return;

    // Запрещаем перемещение в колонку "Просроченные"
    if (targetStatus === 'overdue') {
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Нельзя переместить задачу в колонку "Просроченные". Она перемещается туда автоматически.'
        }
      }));
      return;
    }

    // Запрещаем перемещение из колонки "Просроченные" для MANAGER
    // (это будет проверено в backend, но добавим проверку и здесь)
    if (task.status === 'overdue') {
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Просроченные задачи можно редактировать только ROOT и ADMIN.'
        }
      }));
      return;
    }

    const oldStatus = task.status;

    // Оптимистичное обновление UI
    setTasks(prevTasks => {
      const newTasks = [...prevTasks];
      const updatedTask = newTasks.find(t => t.id === parsedTaskId);
      
      if (updatedTask) {
        updatedTask.status = targetStatus;
        // Если задача завершена, устанавливаем дату завершения
        if (targetStatus === 'completed' && oldStatus !== 'completed') {
          updatedTask.completedAt = new Date().toISOString();
        }
        // Если задача была завершена, но перемещена в другой статус
        else if (oldStatus === 'completed' && targetStatus !== 'completed') {
          updatedTask.completedAt = null;
        }
      }
      
      return newTasks;
    });

    // Отправляем запрос на сервер
    try {
      await axiosAPI.put(`/admin/tasks/${taskId}`, {
        status: targetStatus
      });
      console.log('✅ Задача перемещена успешно');
    } catch (error) {
      console.error('Ошибка перемещения задачи:', error);
      // Возвращаем задачу в исходное состояние при ошибке
      setTasks(prevTasks => {
        const newTasks = [...prevTasks];
        const updatedTask = newTasks.find(t => t.id === parsedTaskId);
        if (updatedTask) {
          updatedTask.status = oldStatus;
          if (oldStatus === 'completed') {
            updatedTask.completedAt = new Date().toISOString();
          } else {
            updatedTask.completedAt = null;
          }
        }
        return newTasks;
      });
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Ошибка обновления статуса задачи'
        }
      }));
    }
  };

  // Обработчик клика по задаче
  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setShowTaskDetails(true);
  };

  // Функция для проверки просроченности задачи с учетом часового пояса менеджера
  const isTaskOverdue = (task) => {
    if (!task.dueDate || task.status === 'completed' || task.status === 'cancelled') {
      return false;
    }
    return isTaskOverdueInManagerTimezone(task.dueDate, currentManagerGeography);
  };

  // Группировка задач по статусам
  const tasksByStatus = {
    pending: tasks.filter(task => task.status === 'pending' && !isTaskOverdue(task)),
    in_progress: tasks.filter(task => task.status === 'in_progress' && !isTaskOverdue(task)),
    completed: tasks.filter(task => task.status === 'completed'),
    cancelled: tasks.filter(task => task.status === 'cancelled'),
    overdue: tasks.filter(task => isTaskOverdue(task))
  };

  const statusColumns = [
    { id: 'pending', title: '⏳ В ожидании', color: '#FFC107' },
    { id: 'in_progress', title: '🔄 В работе', color: '#2196F3' },
    { id: 'completed', title: '✅ Завершена', color: '#4CAF50' },
    { id: 'cancelled', title: '❌ Отменена', color: '#F44336' },
    { id: 'overdue', title: '🚨 Просроченные', color: '#F44336', isOverdue: true }
  ];

  if (loading) {
    return (
      <div className="tasks-page">
        <div className="tasks-loading">
          <div className="loading-spinner"></div>
          <p>Загрузка задач...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tasks-page">
      <div className="tasks-header">
        <h1>📋 Задачи</h1>
        <button 
          className="btn-add-task"
          onClick={() => setShowCreateTask(true)}
        >
          + ЗАДАЧА
        </button>
      </div>

      <div className="tasks-board">
        {statusColumns.map(column => (
          <div 
            key={column.id} 
            className="task-column" 
            style={{ width: '15vw' }}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div 
              className="column-header" 
              style={{ borderTopColor: column.color }}
            >
              <h3>{column.title}</h3>
              <span className="task-count">
                {tasksByStatus[column.id].length}
              </span>
            </div>
            
            <div className="column-content">
              {tasksByStatus[column.id].map((task) => (
                  <div key={`task-${task.id}`} className="task-card-wrapper">
                    <div
                      className={`task-card-draggable ${column.isOverdue ? 'overdue-card' : ''}`}
                      draggable={!column.isOverdue}
                      onDragStart={column.isOverdue ? undefined : (e) => handleDragStart(e, task.id)}
                    >
                      <TaskCard 
                        task={task} 
                        onTaskUpdate={loadTasks}
                        onTaskClick={handleTaskClick}
                        isOverdue={column.isOverdue}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {showCreateTask && (
        <CreateTaskModal
          onClose={() => setShowCreateTask(false)}
          onTaskCreated={loadTasks}
        />
      )}

      {showTaskDetails && selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          onClose={() => {
            setShowTaskDetails(false);
            setSelectedTask(null);
          }}
          onTaskUpdated={loadTasks}
        />
      )}
    </div>
  );
};

export default Tasks;
