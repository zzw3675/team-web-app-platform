import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus,
  Edit2,
  Trash2,
  ChevronLeft,
  Loader2,
  CalendarDays,
  Filter,
  RotateCcw,
  PieChart as PieChartIcon,
  ListTodo,
  Archive,
  ChevronDown,
  Download,
} from 'lucide-react';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import dayjs from 'dayjs';

import { jizhangApi, extractApiError } from '@client/src/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import PlatformCapsule from '@client/src/components/PlatformCapsule';
import {
  getCategoriesByType,
  formatAmount,
  formatDate,
  toDateInputValue,
  INCOME_COLOR,
  EXPENSE_COLOR,
  CATEGORY_COLORS,
} from '@client/src/utils/jizhang-constants';
import type {
  JizhangCategorySummary,
  JizhangRecord,
  CreateJizhangRecordRequest,
  UpdateJizhangRecordRequest,
} from '@shared/api.interface';
import { showConfirm } from '@lark-apaas/client-toolkit';
import { useAuth } from '@client/src/contexts/AuthContext';
import {
  canEditProject,
  escapeHtml,
  fetchAllProjectRecords,
} from '@client/src/pages/Jizhang/jizhangUtils';
import type { AllRecordsResult } from '@client/src/pages/Jizhang/jizhangUtils';

interface RecordFormState {
  recordDate: string;
  incomeExpense: 'income' | 'expense';
  category: string;
  amount: string;
  remark: string;
}

const emptyForm: RecordFormState = {
  recordDate: toDateInputValue(new Date()),
  incomeExpense: 'expense',
  category: '餐饮',
  amount: '',
  remark: '',
};

const JizhangDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'records' | 'summary' | 'recycle'>(
    'records',
  );
  const [page, setPage] = useState(1);
  const [recyclePage, setRecyclePage] = useState(1);
  const pageSize = 20;

  // 筛选
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('');

  // 记录弹窗
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<JizhangRecord | null>(null);
  const [form, setForm] = useState<RecordFormState>(emptyForm);
  // 存档导出中（避免重复点击）
  const [exporting, setExporting] = useState<boolean>(false);

  // 查询项目
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['jizhang-project', projectId],
    queryFn: () => jizhangApi.getProject(projectId!),
    enabled: !!projectId,
  });

  // 是否具备编辑权限：无权限时不渲染写入入口（后端仍会兜底兜回 403）
  const canEdit: boolean = canEditProject(
    project ?? null,
    user?.id,
    user?.level,
  );

  // 查询记录列表
  const recordQueryParams = useMemo(() => {
    const params: Record<string, string | number | undefined> = {
      page,
      pageSize,
    };
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    if (filterType !== 'all') params.incomeExpense = filterType;
    if (filterCategory) params.category = filterCategory;
    return params;
  }, [page, dateFrom, dateTo, filterType, filterCategory]);

  const { data: recordsData, isLoading: recordsLoading } = useQuery({
    queryKey: ['jizhang-records', projectId, recordQueryParams],
    queryFn: () =>
      jizhangApi.listRecords(projectId!, {
        page: recordQueryParams.page as number,
        pageSize: recordQueryParams.pageSize as number,
        dateFrom: recordQueryParams.dateFrom as string | undefined,
        dateTo: recordQueryParams.dateTo as string | undefined,
        incomeExpense:
          (recordQueryParams.incomeExpense as 'income' | 'expense') ||
          undefined,
        category: recordQueryParams.category as string | undefined,
      }),
    enabled: !!projectId && activeTab === 'records',
  });

  // 回收站
  const { data: recycleData, isLoading: recycleLoading } = useQuery({
    queryKey: ['jizhang-recycle', projectId, recyclePage],
    queryFn: () =>
      jizhangApi.listRecycle(projectId!, { page: recyclePage, pageSize }),
    enabled: !!projectId && activeTab === 'recycle',
  });

  // 分类汇总（全量聚合，不受分页影响）：收入 / 支出各取一次
  const summaryQuery = useMemo(
    () => ({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }),
    [dateFrom, dateTo],
  );

  const { data: incomeSummaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['jizhang-summary', projectId, 'income', summaryQuery],
    queryFn: () =>
      jizhangApi.categorySummary(projectId!, {
        ...summaryQuery,
        incomeExpense: 'income',
      }),
    enabled: !!projectId,
  });

  const { data: expenseSummaryData } = useQuery({
    queryKey: ['jizhang-summary', projectId, 'expense', summaryQuery],
    queryFn: () =>
      jizhangApi.categorySummary(projectId!, {
        ...summaryQuery,
        incomeExpense: 'expense',
      }),
    enabled: !!projectId,
  });

  // 汇总数据计算：全部来自全量分类聚合接口
  const summaryStats = useMemo(() => {
    const sumTotal = (items: JizhangCategorySummary[]): number =>
      items.reduce(
        (acc, item) => acc + parseFloat(item.totalAmount || '0'),
        0,
      );
    const groupByCategory = (
      items: JizhangCategorySummary[],
    ): Record<string, number> => {
      const map: Record<string, number> = {};
      for (const item of items) {
        const amount = parseFloat(item.totalAmount || '0');
        map[item.category] = (map[item.category] ?? 0) + amount;
      }
      return map;
    };

    const incomeItems: JizhangCategorySummary[] = incomeSummaryData ?? [];
    const expenseItems: JizhangCategorySummary[] = expenseSummaryData ?? [];
    const totalIncome = sumTotal(incomeItems);
    const totalExpense = sumTotal(expenseItems);

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      incomeByCategory: groupByCategory(incomeItems),
      expenseByCategory: groupByCategory(expenseItems),
    };
  }, [incomeSummaryData, expenseSummaryData]);

  // 饼图数据
  const pieData = useMemo(() => {
    const source = summaryStats.expenseByCategory;
    return Object.entries(source)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [summaryStats]);

  // 新建/编辑 mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateJizhangRecordRequest) =>
      jizhangApi.createRecord(projectId!, data),
    onSuccess: () => {
      toast.success('记录已添加');
      setDialogOpen(false);
      setEditingRecord(null);
      setForm(emptyForm);
      void queryClient.invalidateQueries({
        queryKey: ['jizhang-records'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['jizhang-summary'],
      });
    },
    onError: (err: unknown) => {
      toast.error(extractApiError(err, '操作失败'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; body: UpdateJizhangRecordRequest }) =>
      jizhangApi.updateRecord(projectId!, data.id, data.body),
    onSuccess: () => {
      toast.success('记录已更新');
      setDialogOpen(false);
      setEditingRecord(null);
      setForm(emptyForm);
      void queryClient.invalidateQueries({
        queryKey: ['jizhang-records'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['jizhang-summary'],
      });
    },
    onError: (err: unknown) => {
      toast.error(extractApiError(err, '操作失败'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => jizhangApi.deleteRecord(projectId!, id),
    onSuccess: () => {
      toast.success('已移入回收站');
      void queryClient.invalidateQueries({
        queryKey: ['jizhang-records'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['jizhang-summary'],
      });
    },
    onError: (err: unknown) => {
      toast.error(extractApiError(err, '删除失败'));
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => jizhangApi.restoreRecord(projectId!, id),
    onSuccess: () => {
      toast.success('已恢复');
      void queryClient.invalidateQueries({
        queryKey: ['jizhang-recycle'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['jizhang-records'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['jizhang-summary'],
      });
    },
    onError: (err: unknown) => {
      toast.error(extractApiError(err, '恢复失败'));
    },
  });

  const handleOpenCreate = () => {
    setEditingRecord(null);
    setForm({
      ...emptyForm,
      recordDate: toDateInputValue(new Date()),
      category: getCategoriesByType('expense')[0],
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (record: JizhangRecord) => {
    setEditingRecord(record);
    setForm({
      recordDate: record.recordDate,
      incomeExpense: record.incomeExpense,
      category: record.category,
      amount: record.amount,
      remark: record.remark || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.recordDate) {
      toast.error('请选择日期');
      return;
    }
    if (!form.category) {
      toast.error('请选择分类');
      return;
    }
    const amountNum = parseFloat(form.amount);
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      toast.error('请输入有效金额');
      return;
    }

    const payload = {
      recordDate: form.recordDate,
      incomeExpense: form.incomeExpense,
      category: form.category,
      amount: amountNum.toFixed(2),
      remark: form.remark || undefined,
    };

    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, body: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleTypeChange = (type: 'income' | 'expense') => {
    const cats = getCategoriesByType(type);
    setForm({
      ...form,
      incomeExpense: type,
      category: cats[0],
    });
  };

  // HTML 导出：先按当前筛选循环分页拉全量记录，保证明细与页头统计一致
  const handleExportHtml = async (): Promise<void> => {
    if (!project || exporting) return;
    setExporting(true);
    try {
      const all: AllRecordsResult = await fetchAllProjectRecords(projectId!, {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        incomeExpense: filterType === 'all' ? undefined : filterType,
        category: filterCategory || undefined,
      });
      // 拉不全时退回当前页数据，并在存档标题标注页码，避免误导
      const records: JizhangRecord[] = all.complete
        ? all.items
        : recordsData?.items ?? all.items;
      if (records.length === 0) {
        toast.error('当前筛选条件下没有可导出的记录');
        return;
      }
      if (!all.complete) {
        toast.warning(`记录过多，仅导出第 ${page} 页数据`);
      }
      generateHtmlExport(project.title, records, summaryStats, {
        incompletePage: all.complete ? undefined : page,
      });
    } catch (err: unknown) {
      toast.error(extractApiError(err, '导出失败'));
    } finally {
      setExporting(false);
    }
  };

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 md:p-8">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Archive className="size-6" />
            </EmptyMedia>
            <EmptyTitle>项目不存在</EmptyTitle>
            <EmptyDescription>该记账本不存在或无权限访问</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto relative">
      {/* 顶部栏 */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/jizhang')}
            aria-label="返回项目列表"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-semibold">
              {project.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              收入 <span style={{ color: INCOME_COLOR }}>
                ¥{formatAmount(summaryStats.totalIncome)}
              </span>
              {' '}·{' '}
              支出 <span style={{ color: EXPENSE_COLOR }}>
                ¥{formatAmount(summaryStats.totalExpense)}
              </span>
              {' '}·{' '}
              结余 <span className="font-medium">
                ¥{formatAmount(summaryStats.balance)}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => jizhangApi.exportCsv(projectId!).catch((err) =>
              toast.error(extractApiError(err, '导出失败')),
            )}
          >
            <Download className="w-4 h-4" />
            CSV
          </Button>
          {canEdit && (
            <Button onClick={handleOpenCreate}>
              <Plus className="w-4 h-4" />
              新增记录
            </Button>
          )}
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v as typeof activeTab);
          if (v === 'records') setPage(1);
          if (v === 'recycle') setRecyclePage(1);
        }}
        className="mb-6"
      >
        <TabsList>
          <TabsTrigger value="records" className="gap-1.5">
            <ListTodo className="w-4 h-4" />
            记录
          </TabsTrigger>
          <TabsTrigger value="summary" className="gap-1.5">
            <PieChartIcon className="w-4 h-4" />
            汇总
          </TabsTrigger>
          <TabsTrigger value="recycle" className="gap-1.5">
            <Archive className="w-4 h-4" />
            回收站
          </TabsTrigger>
        </TabsList>

        {/* 记录 Tab */}
        <TabsContent value="records" className="mt-4">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* 左侧记录列表 */}
            <div className="flex-1 min-w-0">
              {/* 筛选栏 */}
              <Card className="mb-4">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <div className="flex items-center gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="justify-start text-left font-normal w-36"
                          >
                            <CalendarDays className="w-3.5 h-3.5 mr-1.5" />
                            {dateFrom || '开始日期'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={dateFrom ? new Date(dateFrom) : undefined}
                            onSelect={(d) => {
                              setDateFrom(d ? toDateInputValue(d) : '');
                              setPage(1);
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <span className="text-muted-foreground text-xs">至</span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="justify-start text-left font-normal w-36"
                          >
                            <CalendarDays className="w-3.5 h-3.5 mr-1.5" />
                            {dateTo || '结束日期'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={dateTo ? new Date(dateTo) : undefined}
                            onSelect={(d) => {
                              setDateTo(d ? toDateInputValue(d) : '');
                              setPage(1);
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      {(dateFrom || dateTo) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDateFrom('');
                            setDateTo('');
                            setPage(1);
                          }}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          清除
                        </Button>
                      )}
                    </div>

                    <div className="w-28">
                      <Select
                        value={filterType}
                        onValueChange={(v) => {
                          setFilterType(v as typeof filterType);
                          setFilterCategory('');
                          setPage(1);
                        }}
                      >
                        <SelectTrigger size="sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">全部</SelectItem>
                          <SelectItem value="income">收入</SelectItem>
                          <SelectItem value="expense">支出</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-32">
                      <Select
                        value={filterCategory}
                        onValueChange={(v) => {
                          setFilterCategory(v);
                          setPage(1);
                        }}
                      >
                        <SelectTrigger size="sm">
                          <SelectValue placeholder="分类" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">全部分类</SelectItem>
                          {(filterType === 'all'
                            ? [...getCategoriesByType('expense'), ...getCategoriesByType('income')]
                            : getCategoriesByType(filterType as 'income' | 'expense')
                          ).map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 记录列表 */}
              {recordsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : !recordsData?.items?.length ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <ListTodo className="size-6" />
                    </EmptyMedia>
                    <EmptyTitle>暂无记录</EmptyTitle>
                    <EmptyDescription>
                      {canEdit
                        ? '点击右上角新增记录按钮开始记账'
                        : '暂无记录，你没有该记账本的编辑权限'}
                    </EmptyDescription>
                  </EmptyHeader>
                  {canEdit && (
                    <EmptyContent>
                      <Button onClick={handleOpenCreate}>
                        <Plus className="w-4 h-4" />
                        新增记录
                      </Button>
                    </EmptyContent>
                  )}
                </Empty>
              ) : (
                <>
                  <div className="rounded-lg border bg-card divide-y">
                    {recordsData.items.map((record: JizhangRecord) => (
                      <div
                        key={record.id}
                        className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-10 h-10 rounded-md flex items-center justify-center shrink-0 text-xs font-medium"
                            style={{
                              backgroundColor:
                                record.incomeExpense === 'income'
                                  ? 'hsl(152 60% 39% / 0.1)'
                                  : 'hsl(0 84% 60% / 0.1)',
                              color:
                                record.incomeExpense === 'income'
                                  ? INCOME_COLOR
                                  : EXPENSE_COLOR,
                            }}
                          >
                            {record.category.slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-sm">
                              {record.category}
                              <Badge
                                variant="outline"
                                className="ml-2 font-normal"
                              >
                                {record.incomeExpense === 'income'
                                  ? '收入'
                                  : '支出'}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[300px]">
                              {formatDate(record.recordDate)}
                              {record.remark && ` · ${record.remark}`}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className="font-semibold text-base"
                            style={{
                              color:
                                record.incomeExpense === 'income'
                                  ? INCOME_COLOR
                                  : EXPENSE_COLOR,
                            }}
                          >
                            {record.incomeExpense === 'income' ? '+' : '-'}
                            ¥{formatAmount(record.amount)}
                          </span>
                          {canEdit && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenEdit(record)}
                                aria-label="编辑"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={async () => {
                                  if (
                                    await showConfirm('确定要删除这条记录吗？可在回收站恢复。')
                                  ) {
                                    deleteMutation.mutate(record.id);
                                  }
                                }}
                                aria-label="删除"
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 分页 */}
                  {recordsData && recordsData.total > pageSize && (
                    <div className="flex items-center justify-between mt-4 text-sm">
                      <span className="text-muted-foreground">
                        共 {recordsData.total} 条
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page <= 1}
                        >
                          上一页
                        </Button>
                        <span className="px-2">
                          第 {page} 页
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((p) => p + 1)}
                          disabled={page * pageSize >= recordsData.total}
                        >
                          下一页
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 右侧分类汇总 */}
            <div className="w-full lg:w-80 shrink-0">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">分类汇总</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {summaryLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : pieData.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      暂无数据
                    </div>
                  ) : (
                    <>
                      <div className="h-56">
                        <ChartContainer
                          config={pieData.reduce(
                            (acc: Record<string, { color: string }>, item) => {
                              acc[item.name] = {
                                color:
                                  CATEGORY_COLORS[item.name] || '#6B7280',
                              };
                              return acc;
                            },
                            {},
                          )}
                        >
                          <PieChart>
                            <Pie
                              data={pieData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={70}
                              label={({ name, percent }) =>
                                `${name} ${(percent * 100).toFixed(0)}%`
                              }
                              labelLine={false}
                            >
                              {pieData.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={
                                    CATEGORY_COLORS[entry.name] || '#6B7280'
                                  }
                                />
                              ))}
                            </Pie>
                            <ChartTooltip
                              content={<ChartTooltipContent />}
                            />
                          </PieChart>
                        </ChartContainer>
                      </div>

                      <div className="space-y-1.5 max-h-64 overflow-y-auto">
                        {pieData.map((item) => {
                          const total = pieData.reduce(
                            (sum, d) => sum + d.value,
                            0,
                          );
                          const percent =
                            total > 0 ? (item.value / total) * 100 : 0;
                          return (
                            <div
                              key={item.name}
                              className="flex items-center justify-between text-sm"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{
                                    backgroundColor:
                                      CATEGORY_COLORS[item.name] || '#6B7280',
                                  }}
                                />
                                <span className="truncate">{item.name}</span>
                              </div>
                              <div className="text-right shrink-0 ml-2">
                                <span className="font-medium">
                                  ¥{formatAmount(item.value)}
                                </span>
                                <span className="text-muted-foreground text-xs ml-2">
                                  {percent.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* 汇总 Tab */}
        <TabsContent value="summary" className="mt-4">
          <div className="grid gap-6 md:grid-cols-3 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="text-sm text-muted-foreground mb-1">总收入</div>
                <div
                  className="text-2xl font-semibold"
                  style={{ color: INCOME_COLOR }}
                >
                  ¥{formatAmount(summaryStats.totalIncome)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-sm text-muted-foreground mb-1">总支出</div>
                <div
                  className="text-2xl font-semibold"
                  style={{ color: EXPENSE_COLOR }}
                >
                  ¥{formatAmount(summaryStats.totalExpense)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-sm text-muted-foreground mb-1">结余</div>
                <div className="text-2xl font-semibold">
                  ¥{formatAmount(summaryStats.balance)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">支出分类明细</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>分类</TableHead>
                    <TableHead className="text-right">金额</TableHead>
                    <TableHead className="text-right">占比</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pieData.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-center text-muted-foreground py-8"
                      >
                        暂无数据
                      </TableCell>
                    </TableRow>
                  ) : (
                    pieData.map((item) => {
                      const total = pieData.reduce(
                        (sum, d) => sum + d.value,
                        0,
                      );
                      const percent =
                        total > 0 ? (item.value / total) * 100 : 0;
                      return (
                        <TableRow key={item.name}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{
                                  backgroundColor:
                                    CATEGORY_COLORS[item.name] || '#6B7280',
                                }}
                              />
                              {item.name}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ¥{formatAmount(item.value)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {percent.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 回收站 Tab */}
        <TabsContent value="recycle" className="mt-4">
          {recycleLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !recycleData?.items?.length ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Archive className="size-6" />
                </EmptyMedia>
                <EmptyTitle>回收站为空</EmptyTitle>
                <EmptyDescription>删除的记录会移到这里</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <div className="rounded-lg border bg-card divide-y">
                {recycleData.items.map((record: JizhangRecord) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-4 opacity-70"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0 text-xs text-muted-foreground">
                        {record.category.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-sm">
                          {record.category}
                          <Badge
                            variant="outline"
                            className="ml-2 font-normal"
                          >
                            {record.incomeExpense === 'income' ? '收入' : '支出'}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">
                          {formatDate(record.recordDate)}
                          {record.remark && ` · ${record.remark}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="font-semibold text-base"
                        style={{
                          color:
                            record.incomeExpense === 'income'
                              ? INCOME_COLOR
                              : EXPENSE_COLOR,
                        }}
                      >
                        {record.incomeExpense === 'income' ? '+' : '-'}
                        ¥{formatAmount(record.amount)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => restoreMutation.mutate(record.id)}
                        disabled={restoreMutation.isPending || !canEdit}
                        title={canEdit ? undefined : '无编辑权限，无法恢复记录'}
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1" />
                        恢复
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {recycleData && recycleData.total > pageSize && (
                <div className="flex items-center justify-between mt-4 text-sm">
                  <span className="text-muted-foreground">
                    共 {recycleData.total} 条
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setRecyclePage((p) => Math.max(1, p - 1))
                      }
                      disabled={recyclePage <= 1}
                    >
                      上一页
                    </Button>
                    <span className="px-2">第 {recyclePage} 页</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRecyclePage((p) => p + 1)}
                      disabled={recyclePage * pageSize >= recycleData.total}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* 新建/编辑记录弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingRecord ? '编辑记录' : '新增记录'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* 日期 */}
            <div className="space-y-2">
              <Label>日期</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarDays className="w-4 h-4 mr-2" />
                    {form.recordDate || '请选择日期'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={
                      form.recordDate ? new Date(form.recordDate) : undefined
                    }
                    onSelect={(d) => {
                      if (d)
                        setForm({ ...form, recordDate: toDateInputValue(d) });
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* 收支类型 */}
            <div className="space-y-2">
              <Label>收支类型</Label>
              <RadioGroup
                value={form.incomeExpense}
                onValueChange={(v) =>
                  handleTypeChange(v as 'income' | 'expense')
                }
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="expense" id="r-expense" />
                  <Label htmlFor="r-expense" className="cursor-pointer">
                    支出
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="income" id="r-income" />
                  <Label htmlFor="r-income" className="cursor-pointer">
                    收入
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* 分类 */}
            <div className="space-y-2">
              <Label>分类</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getCategoriesByType(form.incomeExpense).map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 金额 */}
            <div className="space-y-2">
              <Label htmlFor="amount">金额</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  ¥
                </span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="pl-7"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* 备注 */}
            <div className="space-y-2">
              <Label htmlFor="remark">备注</Label>
              <Textarea
                id="remark"
                value={form.remark}
                onChange={(e) =>
                  setForm({ ...form, remark: e.target.value })
                }
                placeholder="可选，记录详细说明"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                createMutation.isPending || updateMutation.isPending
              }
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              {editingRecord ? '保存修改' : '添加记录'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PlatformCapsule
        projectName={project.title}
        onExportHtml={() => {
          void handleExportHtml();
        }}
      />
    </div>
  );
};

// HTML 导出函数
interface HtmlExportOptions {
  /** 仅导出单页数据时标记页码（记录过多无法拉全量时） */
  incompletePage?: number;
}

function generateHtmlExport(
  projectName: string,
  records: JizhangRecord[],
  stats: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    incomeByCategory: Record<string, number>;
    expenseByCategory: Record<string, number>;
  },
  options: HtmlExportOptions = {},
): void {
  const pageLabel: string = options.incompletePage
    ? `（第 ${options.incompletePage} 页）`
    : '';
  const safeTitle: string = `${escapeHtml(projectName)}${pageLabel}`;
  const sorted = [...records].sort(
    (a, b) => new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime(),
  );

  const expensePie = Object.entries(stats.expenseByCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const rowsHtml = sorted
    .map(
      (r) => `
    <tr>
      <td>${escapeHtml(r.recordDate)}</td>
      <td>${escapeHtml(r.category)}</td>
      <td>${r.incomeExpense === 'income' ? '收入' : '支出'}</td>
      <td style="color:${
        r.incomeExpense === 'income' ? '#10B981' : '#EF4444'
      };font-weight:600;text-align:right;">
        ${r.incomeExpense === 'income' ? '+' : '-'}¥${Number(r.amount).toFixed(2)}
      </td>
      <td>${escapeHtml(r.remark)}</td>
    </tr>
  `,
    )
    .join('');

  const summaryRowsHtml = expensePie
    .map((item) => {
      const total = expensePie.reduce((s, d) => s + d.value, 0);
      const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
      return `
      <tr>
        <td>${escapeHtml(item.name)}</td>
        <td style="text-align:right;">¥${item.value.toFixed(2)}</td>
        <td style="text-align:right;">${pct}%</td>
      </tr>
    `;
    })
    .join('');

  const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle} - 记账本存档</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      padding: 24px;
      line-height: 1.5;
    }
    .container { max-width: 960px; margin: 0 auto; }
    h1 {
      font-size: 24px;
      margin-bottom: 8px;
      color: #0f172a;
    }
    .subtitle { color: #64748b; margin-bottom: 24px; font-size: 14px; }
    .stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
    }
    .stat-label { font-size: 14px; color: #64748b; margin-bottom: 4px; }
    .stat-value { font-size: 24px; font-weight: 600; }
    .income { color: #10B981; }
    .expense { color: #EF4444; }
    .section-title {
      font-size: 18px;
      font-weight: 600;
      margin: 24px 0 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e2e8f0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
    }
    th, td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
      font-size: 14px;
    }
    th {
      background: #f1f5f9;
      font-weight: 600;
      color: #334155;
    }
    tr:last-child td { border-bottom: none; }
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      color: #94a3b8;
      font-size: 12px;
    }
    @media (max-width: 640px) {
      .stats { grid-template-columns: 1fr; }
      body { padding: 12px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${safeTitle}</h1>
    <p class="subtitle">记账本只读存档 · 导出时间：${new Date().toLocaleString(
      'zh-CN',
    )}${options.incompletePage ? ` · 仅含第 ${options.incompletePage} 页明细` : ''}</p>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-label">总收入</div>
        <div class="stat-value income">¥${stats.totalIncome.toFixed(2)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">总支出</div>
        <div class="stat-value expense">¥${stats.totalExpense.toFixed(2)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">结余</div>
        <div class="stat-value">¥${stats.balance.toFixed(2)}</div>
      </div>
    </div>

    <h2 class="section-title">支出分类汇总</h2>
    <table>
      <thead>
        <tr>
          <th>分类</th>
          <th style="text-align:right;">金额</th>
          <th style="text-align:right;">占比</th>
        </tr>
      </thead>
      <tbody>
        ${summaryRowsHtml || '<tr><td colspan="3" style="text-align:center;color:#94a3b8;">暂无数据</td></tr>'}
      </tbody>
    </table>

    <h2 class="section-title">记录明细（共 ${sorted.length} 条）</h2>
    <table>
      <thead>
        <tr>
          <th>日期</th>
          <th>分类</th>
          <th>类型</th>
          <th style="text-align:right;">金额</th>
          <th>备注</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml || '<tr><td colspan="5" style="text-align:center;color:#94a3b8;">暂无记录</td></tr>'}
      </tbody>
    </table>

    <div class="footer">
      该文件为只读存档，由记账本应用导出
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html; charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${projectName}_存档_${dayjs().format('YYYYMMDD')}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  toast.success('HTML 存档已导出');
}

export default JizhangDetail;
