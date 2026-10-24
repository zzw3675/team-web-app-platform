import { useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { CreateUserRequest, Group } from '@shared/api.interface';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  NO_GROUP_VALUE,
  assignableLevels,
  type LevelOption,
} from './userShared';

const createUserSchema = z.object({
  email: z.string().min(1, '请输入邮箱').email('邮箱格式不正确'),
  nickname: z.string().min(1, '请输入昵称').max(100, '昵称最多 100 个字符'),
  password: z.string().min(8, '初始密码至少 8 位').max(64, '密码最多 64 位'),
  level: z.enum(['level_1', 'level_2', 'level_3']),
  groupId: z.string(),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

const defaultValues: CreateUserFormData = {
  email: '',
  nickname: '',
  password: '',
  level: 'level_3',
  groupId: NO_GROUP_VALUE,
};

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: Group[];
  submitting: boolean;
  onSubmit: (payload: CreateUserRequest) => Promise<boolean>;
}

export const CreateUserDialog = ({
  open,
  onOpenChange,
  groups,
  submitting,
  onSubmit,
}: CreateUserDialogProps) => {
  const [errorText, setErrorText] = useState('');

  const form = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues,
  });

  useEffect(() => {
    if (open) {
      form.reset(defaultValues);
      setErrorText('');
    }
  }, [open, form]);

  const handleSubmit = form.handleSubmit(async (data: CreateUserFormData) => {
    setErrorText('');
    const payload: CreateUserRequest = {
      email: data.email.trim(),
      nickname: data.nickname.trim(),
      password: data.password,
      level: data.level,
      groupId: data.groupId === NO_GROUP_VALUE ? null : data.groupId,
    };
    const ok: boolean = await onSubmit(payload);
    if (!ok) {
      setErrorText('创建失败，请检查邮箱是否已被占用');
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>新建用户</DialogTitle>
          <DialogDescription>
            创建的账号直接生效，可立即用邮箱和初始密码登录
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    邮箱
                    <span aria-hidden="true" className="text-destructive">
                      {' '}
                      *
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="off"
                      placeholder="name@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nickname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    昵称
                    <span aria-hidden="true" className="text-destructive">
                      {' '}
                      *
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="显示名称" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    初始密码
                    <span aria-hidden="true" className="text-destructive">
                      {' '}
                      *
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      autoComplete="new-password"
                      placeholder="至少 8 位，创建后告知用户"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="level"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-[140px]">
                    <FormLabel>用户级别</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger aria-label="选择用户级别">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {assignableLevels.map((option: LevelOption) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="groupId"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-[140px]">
                    <FormLabel>所属分组</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger aria-label="选择所属分组">
                          <SelectValue placeholder="未分组" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_GROUP_VALUE}>未分组</SelectItem>
                        {groups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {errorText && (
              <p className="text-sm text-destructive">{errorText}</p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                创建用户
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
