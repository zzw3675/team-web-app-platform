'use client';

import { Plus } from 'lucide-react';

import { useEntityComboboxContext } from '@client/src/components/business-ui/entity-combobox/context';
import { SearchTrigger } from '@client/src/components/business-ui/entity-combobox/search-trigger';
import {
  addButtonIconVariants,
  addButtonVariants,
  type ComboboxSize,
} from '@client/src/components/business-ui/entity-combobox/size-variants';
import type {
  ClassNamesConfig,
  ItemValue,
  TriggerRenderProps,
  TriggerType,
} from '@client/src/components/business-ui/entity-combobox/types';
import { cn } from '@/lib/utils';
import { Badge } from '@client/src/components/ui/badge';
import { Button } from '@client/src/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@client/src/components/ui/tooltip';

export type BaseComboboxTriggerProps = {
  triggerType?: TriggerType;
  size?: ComboboxSize;
  placeholder?: string;
  renderTrigger?: (props: TriggerRenderProps) => React.ReactNode;
  maxTagCount?: number | 'responsive';
  maxTagTextLength?: number;
  tagClosable?: boolean;
  classNames?: ClassNamesConfig;
  onFocus?: (e: React.FocusEvent<HTMLElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLElement>) => void;
  renderTag?: (
    value: ItemValue,
    onClose: (value: ItemValue, e: React.MouseEvent) => void,
    disabled?: boolean,
  ) => React.ReactNode;
  getOptionDisabled?: (value: ItemValue) => boolean;
  renderAddButton?: (button: React.ReactNode) => React.ReactNode;
  ref?: React.Ref<HTMLButtonElement>;
} & Omit<React.ComponentPropsWithoutRef<'button'>, 'children'>;

export const BaseComboboxTrigger = ({
  triggerType = 'button',
  size = 'medium',
  placeholder = '请选择',
  renderTrigger,
  maxTagCount,
  maxTagTextLength,
  tagClosable = true,
  classNames,
  onFocus,
  onBlur,
  renderTag,
  getOptionDisabled,
  renderAddButton,
  ref,
  ...props
}: BaseComboboxTriggerProps) => {
  const {
    selectedValue,
    multiple,
    open,
    disabled,
    handleClear,
    handleDeselect,
  } = useEntityComboboxContext();

  if (triggerType === 'custom' && renderTrigger) {
    return <>{renderTrigger({ selectedValue, multiple, open, disabled })}</>;
  }

  if (triggerType === 'search') {
    return (
      <SearchTrigger
        size={size}
        placeholder={placeholder}
        maxTagCount={maxTagCount}
        maxTagTextLength={maxTagTextLength}
        tagClosable={tagClosable}
        classNames={classNames}
        onFocus={onFocus as (e: React.FocusEvent<HTMLDivElement>) => void}
        onBlur={onBlur as (e: React.FocusEvent<HTMLDivElement>) => void}
        renderTag={renderTag}
        getOptionDisabled={getOptionDisabled}
      />
    );
  }

  const hasValue = !multiple
    ? !!selectedValue
    : Array.isArray(selectedValue) && selectedValue.length > 0;

  const maxDisplayCount =
    typeof maxTagCount === 'number' ? maxTagCount : Infinity;

  const hiddenCount =
    multiple && Array.isArray(selectedValue) && typeof maxTagCount === 'number'
      ? Math.max(0, selectedValue.length - maxTagCount)
      : 0;

  const hiddenTags =
    multiple && Array.isArray(selectedValue) && typeof maxTagCount === 'number'
      ? selectedValue.slice(maxTagCount)
      : [];

  const handleTagClose = (value: ItemValue, e: React.MouseEvent) => {
    e.stopPropagation();
    if (getOptionDisabled?.(value)) return;
    if (!multiple) {
      handleClear();
    } else {
      handleDeselect(value);
    }
  };

  return (
    <div
      className={cn(
        'flex w-full flex-wrap items-center gap-2',
        classNames?.trigger,
      )}
    >
      {hasValue && (
        <>
          {!multiple && selectedValue ? (
            renderTag ? (
              renderTag(
                selectedValue as ItemValue,
                handleTagClose,
                getOptionDisabled?.(selectedValue as ItemValue),
              )
            ) : (
              <Badge
                variant="secondary"
                className={cn('h-7 text-xs', classNames?.tag)}
              >
                {(selectedValue as ItemValue).name}
              </Badge>
            )
          ) : multiple &&
            Array.isArray(selectedValue) &&
            selectedValue.length > 0 ? (
            <>
              {renderTag ? (
                <>
                  {selectedValue
                    .slice(0, maxDisplayCount)
                    .map((item) =>
                      renderTag(
                        item,
                        handleTagClose,
                        getOptionDisabled?.(item),
                      ),
                    )}
                  {hiddenCount > 0 && (
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'h-7 cursor-pointer text-xs',
                            classNames?.tag,
                          )}
                        >
                          +{hiddenCount}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent
                        className="w-auto max-w-80 p-2"
                        align="start"
                      >
                        <div className="flex flex-wrap gap-1">
                          {hiddenTags.map((item) =>
                            renderTag(
                              item,
                              handleTagClose,
                              getOptionDisabled?.(item),
                            ),
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </>
              ) : (
                <>
                  {selectedValue.slice(0, maxDisplayCount).map((item) => (
                    <Badge
                      key={item.id}
                      variant="secondary"
                      className={cn('h-7 text-xs', classNames?.tag)}
                    >
                      {item.name}
                    </Badge>
                  ))}
                  {hiddenCount > 0 && (
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'h-7 cursor-pointer text-xs',
                            classNames?.tag,
                          )}
                        >
                          +{hiddenCount}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent
                        className="w-auto max-w-80 p-2"
                        align="start"
                      >
                        <div className="flex flex-wrap gap-1">
                          {hiddenTags.map((item) => (
                            <Badge
                              key={item.id}
                              variant="secondary"
                              className={cn('h-7 text-xs', classNames?.tag)}
                            >
                              {item.name}
                            </Badge>
                          ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </>
              )}
            </>
          ) : null}
        </>
      )}

      {(() => {
        const addButton = (
          <Button
            ref={ref}
            variant="secondary"
            size="icon"
            role="combobox"
            aria-expanded={open}
            data-state={open ? 'open' : 'closed'}
            aria-controls="combobox-content"
            disabled={disabled}
            className={addButtonVariants({ size })}
            onFocus={
              onFocus as (e: React.FocusEvent<HTMLButtonElement>) => void
            }
            onBlur={onBlur as (e: React.FocusEvent<HTMLButtonElement>) => void}
            {...props}
          >
            <Plus className={addButtonIconVariants({ size })} />
          </Button>
        );
        return renderAddButton ? renderAddButton(addButton) : addButton;
      })()}
    </div>
  );
};
