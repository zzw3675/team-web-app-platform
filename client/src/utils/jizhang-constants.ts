export const EXPENSE_CATEGORIES = [
  '餐饮',
  '交通',
  '购物',
  '居家',
  '医疗',
  '教育',
  '娱乐',
  '其他',
];

export const INCOME_CATEGORIES = ['工资', '奖金', '投资', '其他'];

export const getCategoriesByType = (
  type: 'income' | 'expense',
): string[] => {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
};

export const INCOME_COLOR = '#10B981';
export const EXPENSE_COLOR = '#EF4444';

export const CATEGORY_COLORS: Record<string, string> = {
  餐饮: '#F97316',
  交通: '#3B82F6',
  购物: '#EC4899',
  居家: '#8B5CF6',
  医疗: '#EF4444',
  教育: '#10B981',
  娱乐: '#F59E0B',
  其他: '#6B7280',
  工资: '#10B981',
  奖金: '#059669',
  投资: '#22C3D6',
};

export const formatAmount = (amount: string | number): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (Number.isNaN(num)) return '0.00';
  return num.toFixed(2);
};

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const formatDateTime = (dateStr: string): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}`;
};

export const toDateInputValue = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const scopeLabels: Record<string, string> = {
  all: '所有人',
  group: '指定组',
  owner: '仅负责人',
  users: '指定人',
};
