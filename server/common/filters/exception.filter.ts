import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { BusinessException } from '../interfaces/exception.interface';
import { HTTP_STATUS_TO_RESPONSE_CODE_MAP, ResponseCode } from '../constants/api_response_code';
import { ApiErrorResponse } from '../interfaces/api_response.interface';

interface HttpExceptionDetail {
  message: string;
  fieldErrors?: Record<string, string[]>;
}

// 全局异常过滤器，用于捕获所有未处理的异常
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // 如果响应头已发送，则不处理
    if (response.headersSent) {
      return;
    }

    let errorResponse: Omit<ApiErrorResponse, 'httpStatus'>;
    let httpStatus: HttpStatus;

    if (exception instanceof BusinessException) {
      // 业务异常
      httpStatus = exception.httpStatus;
      errorResponse = {
        error: {
          code: exception.code,
          message: exception.message,
          details: exception.details,
          fieldErrors: exception.fieldErrors,
          timestamp: Date.now(),
        },
      };
    } else if (exception instanceof HttpException) {
      // HTTP异常：只透出 message / fieldErrors 结构化字段
      httpStatus = exception.getStatus() as HttpStatus;
      const detail = this.extractHttpExceptionDetail(exception);

      errorResponse = {
        error: {
          code: HTTP_STATUS_TO_RESPONSE_CODE_MAP[httpStatus],
          message: detail.message,
          fieldErrors: detail.fieldErrors,
          timestamp: Date.now(),
        },
      };
    } else if (this.extractPostgresErrorCode(exception) === '22P02') {
      // Postgres invalid_text_representation：路径/查询参数与列类型不匹配（最常见是非法 UUID）
      // 与「合法 UUID 但记录不存在」走同一条 not-found 语义，避免 500 噪声
      httpStatus = HttpStatus.NOT_FOUND;
      errorResponse = {
        error: {
          code: ResponseCode.NOT_FOUND,
          message: '资源不存在',
          timestamp: Date.now(),
        },
      };
    } else {
      // 未知异常：堆栈只进服务端日志，响应体不含任何内部细节
      httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
      this.logUnknownException(exception);
      errorResponse = {
        error: {
          code: ResponseCode.INTERNAL_ERROR,
          message: '服务器内部错误',
          timestamp: Date.now(),
        },
      };
    }

    response.status(httpStatus).json(errorResponse);
  }

  private extractPostgresErrorCode(error: unknown): string | undefined {
    let current: unknown = error;
    for (let depth = 0; depth < 4 && current && typeof current === 'object'; depth += 1) {
      const { code, cause } = current as { code?: unknown; cause?: unknown };
      if (typeof code === 'string') return code;
      current = cause;
    }
    return undefined;
  }

  private extractHttpExceptionDetail(exception: HttpException): HttpExceptionDetail {
    const exceptionResponse = exception.getResponse();

    if (typeof exceptionResponse === 'string') {
      return { message: exceptionResponse };
    }

    const payload: Record<string, unknown> =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? (exceptionResponse as Record<string, unknown>)
        : {};

    return {
      message: this.extractMessage(payload.message, exception.message),
      fieldErrors: this.extractFieldErrors(payload.fieldErrors),
    };
  }

  private extractMessage(rawMessage: unknown, fallback: string): string {
    if (typeof rawMessage === 'string' && rawMessage.length > 0) {
      return rawMessage;
    }

    if (Array.isArray(rawMessage)) {
      const messages = rawMessage.filter(
        (item: unknown): item is string => typeof item === 'string' && item.length > 0,
      );
      if (messages.length > 0) return messages.join('; ');
    }

    return fallback;
  }

  private extractFieldErrors(rawFieldErrors: unknown): Record<string, string[]> | undefined {
    if (
      typeof rawFieldErrors !== 'object' ||
      rawFieldErrors === null ||
      Array.isArray(rawFieldErrors)
    ) {
      return undefined;
    }

    const result: Record<string, string[]> = {};
    for (const [field, value] of Object.entries(rawFieldErrors as Record<string, unknown>)) {
      if (!Array.isArray(value)) continue;
      const messages = value.filter(
        (item: unknown): item is string => typeof item === 'string',
      );
      if (messages.length > 0) result[field] = messages;
    }

    return Object.keys(result).length > 0 ? result : undefined;
  }

  private logUnknownException(exception: unknown): void {
    if (!(exception instanceof Error)) {
      this.logger.error(`未处理异常: ${String(exception)}`);
      return;
    }

    this.logger.error(`未处理异常: ${exception.message}`, exception.stack);

    const cause = exception.cause;
    if (cause === undefined) return;

    if (typeof cause === 'string') {
      this.logger.error(`未处理异常原因: ${cause}`);
    } else if (cause instanceof Error) {
      this.logger.error(`未处理异常原因: ${cause.message}`, cause.stack);
    }
  }
}
