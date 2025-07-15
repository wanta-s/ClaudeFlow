'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Task {
  id: string;
  title: string;
  completed: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // 仮のタスクデータ
    setTasks([
      { id: '1', title: 'サンプルタスク1', completed: false },
      { id: '2', title: 'サンプルタスク2', completed: true },
    ]);
  }, []);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle,
      completed: false,
    };

    setTasks([...tasks, newTask]);
    setNewTaskTitle('');
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(task =>
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const handleLogout = () => {
    router.push('/');
  };

  return (
    <div style={{ maxWidth: '600px', margin: '50px auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>ダッシュボード</h1>
        <button
          onClick={handleLogout}
          style={{
            padding: '8px 16px',
            backgroundColor: 'white',
            color: '#666',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          ログアウト
        </button>
      </div>

      <form onSubmit={handleAddTask} style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="新しいタスクを入力"
            style={{
              flex: 1,
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '10px 20px',
              backgroundColor: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            追加
          </button>
        </div>
      </form>

      <div>
        <h2>タスク一覧</h2>
        {tasks.length === 0 ? (
          <p style={{ color: '#666' }}>タスクがありません</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {tasks.map((task) => (
              <li
                key={task.id}
                style={{
                  padding: '15px',
                  marginBottom: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleTask(task.id)}
                    style={{ width: '20px', height: '20px' }}
                  />
                  <span
                    style={{
                      textDecoration: task.completed ? 'line-through' : 'none',
                      color: task.completed ? '#999' : '#333',
                    }}
                  >
                    {task.title}
                  </span>
                </div>
                <button
                  onClick={() => deleteTask(task.id)}
                  style={{
                    padding: '5px 10px',
                    backgroundColor: '#ff4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}