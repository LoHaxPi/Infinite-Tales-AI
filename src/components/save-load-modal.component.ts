import { Component, input, output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PersistenceService } from '../services/persistence.service';
import { SaveSlotMeta } from '../models/save-data.model';

@Component({
  selector: 'app-save-load-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4" (click)="close.emit()">
      <div class="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-md max-h-[70vh] overflow-hidden flex flex-col" (click)="$event.stopPropagation()">
        
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-medium text-gray-200">
            {{ mode() === 'save' ? '保存游戏' : '读取存档' }}
          </h2>
           @if (mode() === 'save') {
            <button (click)="onSaveNew()" class="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-full transition-colors flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
              新建存档
            </button>
           }
        </div>

        <div class="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
          @if (persistenceService.saveList().length === 0 && persistenceService.corruptedSaveList().length === 0) {
            <p class="text-gray-500 text-sm text-center py-8">暂无存档</p>
          } @else {
            @for (slot of persistenceService.saveList(); track slot.id) {
              <div class="group flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all relative">
                <button (click)="onSlotClick(slot.id)" class="flex-1 text-left">
                  <p class="text-sm text-gray-200 group-hover:text-white transition-colors">{{ slot.summary }}</p>
                  <div class="flex items-center gap-2 mt-1">
                    <span class="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-gray-500">
                      {{ slot.provider === 'google-genai' ? 'Gemini' : 'OpenAI' }}
                    </span>
                    <p class="text-xs text-gray-500 font-mono">{{ formatDate(slot.timestamp) }}</p>
                  </div>
                  @if (mode() === 'save') {
                    <p class="text-[10px] text-amber-500/70 mt-1">点击覆盖此存档</p>
                  }
                </button>

                <button (click)="onAskDelete(slot); $event.stopPropagation()" class="p-2 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all" title="删除存档">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
              </div>
            }

            @if (persistenceService.corruptedSaveList().length > 0) {
              <div class="pt-3 mt-2 border-t border-red-500/20 space-y-2">
                <p class="text-xs text-red-300">损坏存档（可删除）：</p>
                @for (corrupted of persistenceService.corruptedSaveList(); track corrupted.id) {
                  <div class="flex items-center justify-between p-3 rounded-xl border border-red-500/20 bg-red-500/5">
                    <div>
                      <p class="text-sm text-red-200">ID: {{ corrupted.id }}</p>
                      <p class="text-xs text-red-300/80">{{ corrupted.reason }}</p>
                    </div>
                    <button (click)="onAskDeleteCorrupted(corrupted.id)" class="px-3 py-1 text-xs text-red-100 bg-red-600/50 hover:bg-red-500/60 rounded-lg transition-all">删除</button>
                  </div>
                }
              </div>
            }
          }
        </div>

        <button (click)="close.emit()" class="mt-4 w-full py-2 text-sm text-gray-400 hover:text-white border border-white/10 rounded-xl hover:bg-white/5 transition-all">
          关闭
        </button>
      </div>
    </div>

    @if (showOverwriteConfirm()) {
      <div class="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4" (click)="showOverwriteConfirm.set(false)">
        <div class="bg-gray-800 border border-white/10 rounded-xl p-6 w-full max-w-sm shadow-2xl" (click)="$event.stopPropagation()">
          <h3 class="text-lg font-medium text-white mb-2">覆盖存档</h3>
          <p class="text-sm text-gray-400 mb-4">确定要覆盖这个存档吗？此操作不可撤销。</p>
          <div class="flex gap-3">
            <button 
              (click)="showOverwriteConfirm.set(false)" 
              class="flex-1 py-2 text-sm text-gray-400 hover:text-white border border-white/10 rounded-lg hover:bg-white/5 transition-all"
            >
              取消
            </button>
            <button 
              (click)="confirmOverwrite()" 
              class="flex-1 py-2 text-sm text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition-all"
            >
              确认覆盖
            </button>
          </div>
        </div>
      </div>
    }

    @if (showDeleteConfirm()) {
      <div class="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4" (click)="cancelDelete()">
        <div class="bg-gray-800 border border-white/10 rounded-xl p-6 w-full max-w-sm shadow-2xl" (click)="$event.stopPropagation()">
          <h3 class="text-lg font-medium text-white mb-2">删除存档</h3>
          @if (pendingDeleteSlot()) {
            <p class="text-sm text-gray-300">{{ pendingDeleteSlot()!.summary }}</p>
            <p class="text-xs text-gray-500 mt-1">{{ formatDate(pendingDeleteSlot()!.timestamp) }}</p>
          } @else if (pendingDeleteCorruptedId()) {
            <p class="text-sm text-gray-300">损坏存档 ID: {{ pendingDeleteCorruptedId() }}</p>
          }
          <p class="text-sm text-gray-400 mt-3 mb-4">确定要删除吗？此操作不可撤销。</p>
          <div class="flex gap-3">
            <button (click)="cancelDelete()" class="flex-1 py-2 text-sm text-gray-400 hover:text-white border border-white/10 rounded-lg hover:bg-white/5 transition-all">取消</button>
            <button (click)="confirmDelete()" class="flex-1 py-2 text-sm text-white bg-red-600 hover:bg-red-500 rounded-lg transition-all">确认删除</button>
          </div>
        </div>
      </div>
    }
  `
})
export class SaveLoadModalComponent {
  mode = input<'save' | 'load'>('load');
  close = output<void>();
  save = output<void>();
  load = output<string>();
  overwrite = output<string>();

  persistenceService = inject(PersistenceService);

  showOverwriteConfirm = signal(false);
  pendingOverwriteId = signal<string | null>(null);

  showDeleteConfirm = signal(false);
  pendingDeleteSlot = signal<SaveSlotMeta | null>(null);
  pendingDeleteCorruptedId = signal<string | null>(null);

  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  onSlotClick(id: string) {
    if (this.mode() === 'load') {
      this.load.emit(id);
    } else {
      this.pendingOverwriteId.set(id);
      this.showOverwriteConfirm.set(true);
    }
  }

  confirmOverwrite() {
    const id = this.pendingOverwriteId();
    if (id) {
      this.overwrite.emit(id);
    }
    this.showOverwriteConfirm.set(false);
    this.pendingOverwriteId.set(null);
  }

  onSaveNew() {
    this.save.emit();
  }

  onAskDelete(slot: SaveSlotMeta) {
    this.pendingDeleteSlot.set(slot);
    this.pendingDeleteCorruptedId.set(null);
    this.showDeleteConfirm.set(true);
  }

  onAskDeleteCorrupted(id: string) {
    this.pendingDeleteSlot.set(null);
    this.pendingDeleteCorruptedId.set(id);
    this.showDeleteConfirm.set(true);
  }

  cancelDelete() {
    this.showDeleteConfirm.set(false);
    this.pendingDeleteSlot.set(null);
    this.pendingDeleteCorruptedId.set(null);
  }

  confirmDelete() {
    const slot = this.pendingDeleteSlot();
    const corruptedId = this.pendingDeleteCorruptedId();

    if (slot) {
      this.persistenceService.delete(slot.id);
    }

    if (corruptedId) {
      this.persistenceService.delete(corruptedId);
    }

    this.cancelDelete();
  }
}
