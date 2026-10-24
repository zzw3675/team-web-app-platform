import { cva } from 'class-variance-authority';

export type ComboboxSize = 'medium' | 'small' | 'xs';

export const searchTriggerVariants = cva(
  [
    'border-input bg-background',
    'flex w-full cursor-pointer items-center gap-1 rounded-md border',
    'hover:border-ring',
    'focus-visible:ring-3 focus-visible:ring-ring/20',
    'data-[state=open]:ring-3 data-[state=open]:ring-ring/20',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'focus-visible:border-ring focus-visible:outline-none data-[state=open]:border-ring',
  ],
  {
    variants: {
      size: {
        medium: 'min-h-9 px-3 py-1.5 text-sm',
        small: 'min-h-8 px-3 py-1 text-sm',
        xs: 'min-h-7 px-2 py-1 text-xs',
      },
    },
    defaultVariants: {
      size: 'medium',
    },
  },
);

export const searchInputVariants = cva('', {
  variants: {
    size: {
      medium: 'text-sm',
      small: 'text-sm',
      xs: 'text-xs',
    },
  },
  defaultVariants: {
    size: 'medium',
  },
});

export const searchTagVariants = cva('gap-1 pr-1 font-normal', {
  variants: {
    size: {
      medium: 'h-6 text-sm leading-[22px]',
      small: 'h-6 text-sm leading-[22px]',
      xs: 'h-5 text-xs leading-4',
    },
  },
  defaultVariants: {
    size: 'medium',
  },
});

export const tagAvatarVariants = cva('', {
  variants: {
    size: {
      medium: 'size-5',
      small: 'size-5',
      xs: 'size-4',
    },
  },
  defaultVariants: {
    size: 'medium',
  },
});

export const tagIconVariants = cva('', {
  variants: {
    size: {
      medium: 'size-5',
      small: 'size-5',
      xs: 'size-4',
    },
  },
  defaultVariants: {
    size: 'medium',
  },
});

export const tagCloseIconVariants = cva('text-foreground', {
  variants: {
    size: {
      medium: 'size-2.5',
      small: 'size-2.5',
      xs: 'size-2',
    },
  },
  defaultVariants: {
    size: 'medium',
  },
});

export const addButtonVariants = cva(
  [
    'shrink-0 rounded-full p-0',
    'bg-neutral-700/10 hover:bg-neutral-700/20! dark:bg-neutral-500/10 dark:hover:bg-neutral-500/20!',
    'data-[state=open]:bg-neutral-700/20 dark:data-[state=open]:bg-neutral-500/20',
  ],
  {
    variants: {
      size: {
        medium: 'size-6',
        small: 'size-6',
        xs: 'size-4',
      },
    },
    defaultVariants: {
      size: 'medium',
    },
  },
);

export const addButtonIconVariants = cva('', {
  variants: {
    size: {
      medium: 'size-4',
      small: 'size-4',
      xs: 'size-2',
    },
  },
  defaultVariants: {
    size: 'medium',
  },
});

export const listItemVariants = cva('flex items-center gap-2', {
  variants: {
    size: {
      medium: 'h-[50px] py-2',
      small: 'h-[50px] py-2',
      xs: 'h-[46px] py-1.5',
    },
  },
  defaultVariants: {
    size: 'medium',
  },
});

export const listItemAvatarVariants = cva('', {
  variants: {
    size: {
      medium: 'size-8',
      small: 'size-8',
      xs: 'size-7',
    },
  },
  defaultVariants: {
    size: 'medium',
  },
});

export const listItemNameVariants = cva('truncate', {
  variants: {
    size: {
      medium: 'text-sm leading-[22px]',
      small: 'text-sm leading-[22px]',
      xs: 'text-xs leading-4',
    },
  },
  defaultVariants: {
    size: 'medium',
  },
});

export const listItemSubTextVariants = cva(
  'truncate leading-4 text-muted-foreground',
  {
    variants: {
      size: {
        medium: 'text-xs',
        small: 'text-xs',
        xs: 'text-[10px]',
      },
    },
    defaultVariants: {
      size: 'medium',
    },
  },
);

export const itemPillVariants = cva(
  [
    'w-fit gap-1 rounded-full border-0 bg-[#E8E8E9] font-normal dark:bg-[#3D3E3E]',
    'pt-px pb-px pl-0.5',
  ],
  {
    variants: {
      size: {
        medium: 'h-[22px] pr-2 text-sm leading-5 [&>svg]:size-5',
        small: 'h-[22px] pr-2 text-sm leading-5 [&>svg]:size-5',
        xs: 'h-5 pr-1.5 text-xs leading-4 [&>svg]:size-4',
      },
    },
    defaultVariants: {
      size: 'medium',
    },
  },
);

export const itemPillTextVariants = cva(
  'max-w-[120px] truncate text-foreground',
  {
    variants: {
      size: {
        medium: 'text-sm leading-5',
        small: 'text-sm leading-5',
        xs: 'text-xs leading-4',
      },
    },
    defaultVariants: {
      size: 'medium',
    },
  },
);

export const skeletonItemVariants = cva(
  'flex items-center gap-2 rounded-sm px-2',
  {
    variants: {
      size: {
        medium: 'h-[50px] py-3.5',
        small: 'h-[50px] py-3.5',
        xs: 'h-[46px] py-1.5',
      },
    },
    defaultVariants: {
      size: 'medium',
    },
  },
);

export const skeletonAvatarVariants = cva('rounded-full', {
  variants: {
    size: {
      medium: 'size-8',
      small: 'size-8',
      xs: 'size-7',
    },
  },
  defaultVariants: {
    size: 'medium',
  },
});
