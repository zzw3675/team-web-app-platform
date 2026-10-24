'use client';

import { BaseComboboxContent } from '@client/src/components/business-ui/entity-combobox/base-combobox-content';
import { BaseComboboxList } from '@client/src/components/business-ui/entity-combobox/base-combobox-list';
import { BaseComboboxSearch } from '@client/src/components/business-ui/entity-combobox/base-combobox-search';
import { BaseComboboxTrigger } from '@client/src/components/business-ui/entity-combobox/base-combobox-trigger';
import { useEntityComboboxContext } from '@client/src/components/business-ui/entity-combobox/context';
import type {
  ItemValue,
  PopoverWrapperProps,
} from '@client/src/components/business-ui/entity-combobox/types';
import { cn } from '@/lib/utils';
import { Popover, PopoverTrigger } from '@client/src/components/ui/popover';

export function PopoverWrapper<
  T = unknown,
  TRaw = unknown,
  TValue extends ItemValue<TRaw> = ItemValue<TRaw>,
>(props: PopoverWrapperProps<T, TRaw, TValue>) {
  const {
    size,
    triggerType = 'button',
    renderTrigger,
    placeholder,
    maxTagCount,
    maxTagTextLength,
    tagClosable,
    className,
    classNames,
    placement,
    align,
    sideOffset,
    showSearch,
    searchPlaceholder,
    renderItem,
    renderTag,
    getItemValue,
    getOptionDisabled,
    emptyText,
    loadingText,
    onFocus,
    onBlur,
    slotProps,
    children,
  } = props;

  const { open, setOpen, disabled } = useEntityComboboxContext();

  const handleOpenChange = (newOpen: boolean) => {
    if (disabled && newOpen) return;
    setOpen(newOpen);
  };

  const renderPopoverContent = () => (
    <BaseComboboxContent
      popoverProps={slotProps?.popover}
      className={classNames?.popover}
      side={placement}
      align={align}
      sideOffset={sideOffset}
    >
      {children || (
        <>
          {(showSearch || triggerType === 'search') && (
            <BaseComboboxSearch
              placeholder={searchPlaceholder}
              className={classNames?.search}
            />
          )}
          <BaseComboboxList
            renderItem={renderItem}
            getItemValue={getItemValue}
            getOptionDisabled={
              getOptionDisabled as ((value: ItemValue) => boolean) | undefined
            }
            emptyText={emptyText}
            loadingText={loadingText}
            classNames={classNames}
          />
        </>
      )}
    </BaseComboboxContent>
  );

  if (triggerType === 'button') {
    return (
      <div className={cn(className, classNames?.root)}>
        <Popover open={open} onOpenChange={handleOpenChange}>
          <BaseComboboxTrigger
            triggerType={triggerType}
            size={size}
            placeholder={placeholder}
            renderTrigger={renderTrigger as any}
            maxTagCount={maxTagCount}
            maxTagTextLength={maxTagTextLength}
            tagClosable={tagClosable}
            classNames={classNames}
            onFocus={onFocus}
            onBlur={onBlur}
            renderTag={renderTag as any}
            getOptionDisabled={
              getOptionDisabled as ((value: ItemValue) => boolean) | undefined
            }
            renderAddButton={(buttonProps) => (
              <PopoverTrigger asChild>{buttonProps}</PopoverTrigger>
            )}
          />
          {renderPopoverContent()}
        </Popover>
      </div>
    );
  }

  return (
    <div className={cn(className, classNames?.root)}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <div>
            <BaseComboboxTrigger
              triggerType={triggerType}
              size={size}
              placeholder={placeholder}
              renderTrigger={renderTrigger as any}
              maxTagCount={maxTagCount}
              maxTagTextLength={maxTagTextLength}
              tagClosable={tagClosable}
              classNames={classNames}
              onFocus={onFocus}
              onBlur={onBlur}
              renderTag={renderTag as any}
              getOptionDisabled={
                getOptionDisabled as ((value: ItemValue) => boolean) | undefined
              }
            />
          </div>
        </PopoverTrigger>
        {renderPopoverContent()}
      </Popover>
    </div>
  );
}
