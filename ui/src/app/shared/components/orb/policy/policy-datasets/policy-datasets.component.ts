import {
  AfterViewChecked,
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NbDialogService } from '@nebular/theme';
import {
  ColumnMode,
  DatatableComponent,
  TableColumn,
} from '@swimlane/ngx-datatable';
import { AgentPolicy } from 'app/common/interfaces/orb/agent.policy.interface';
import { Dataset } from 'app/common/interfaces/orb/dataset.policy.interface';
import { DatasetPoliciesService } from 'app/common/services/dataset/dataset.policies.service';
import { NotificationsService } from 'app/common/services/notifications/notifications.service';
import { DatasetFromComponent, DATASET_RESPONSE } from 'app/pages/datasets/dataset-from/dataset-from.component';
import { DatasetDeleteComponent } from 'app/pages/datasets/delete/dataset.delete.component';
import { AgentGroupDetailsComponent } from 'app/pages/fleet/groups/details/agent.group.details.component';
import { SinkDetailsComponent } from 'app/pages/sinks/details/sink.details.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'ngx-policy-datasets',
  templateUrl: './policy-datasets.component.html',
  styleUrls: ['./policy-datasets.component.scss'],
})
export class PolicyDatasetsComponent
  implements OnInit, OnDestroy, AfterViewInit, AfterViewChecked, OnChanges {
  @Input()
  datasets: Dataset[];

  @Input()
  policy: AgentPolicy;

  @Output()
  refreshPolicy: EventEmitter<string>;

  isLoading: boolean;

  subscription: Subscription;

  errors;

  columnMode = ColumnMode;

  columns: TableColumn[];

  tableSorts = [
    {
      prop: 'name',
      dir: 'asc',
    },
  ];

  // templates
  @ViewChild('actionsTemplateCell') actionsTemplateCell: TemplateRef<any>;

  @ViewChild('groupTemplateCell') groupTemplateCell: TemplateRef<any>;

  @ViewChild('validTemplateCell') validTemplateCell: TemplateRef<any>;

  @ViewChild('sinksTemplateCell') sinksTemplateCell: TemplateRef<any>;

  @ViewChild('tableWrapper') tableWrapper;

  @ViewChild(DatatableComponent) table: DatatableComponent;

  private currentComponentWidth;

  constructor(
    private dialogService: NbDialogService,
    private cdr: ChangeDetectorRef,
    protected router: Router,
    protected route: ActivatedRoute,
    protected datasetService: DatasetPoliciesService,
    private notificationsService: NotificationsService,
    ) {
    this.refreshPolicy = new EventEmitter<string>();
    this.datasets = [];
    this.errors = {};
  }

  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges) {}

  ngAfterViewInit() {
    this.columns = [
      {
        prop: 'agent_group',
        name: 'Agent Group',
        resizeable: true,
        canAutoResize: true,
        flexGrow: 1,
        cellTemplate: this.groupTemplateCell,
      },
      {
        prop: 'valid',
        name: 'Valid',
        resizeable: true,
        canAutoResize: true,
        minWidth: 80,        
        flexGrow: 0,
        cellTemplate: this.validTemplateCell,
      },
      {
        prop: 'sinks',
        name: 'Sinks',
        resizeable: true,
        canAutoResize: true,
        flexGrow: 1,
        cellTemplate: this.sinksTemplateCell,
      },
      {
        name: '',
        prop: 'actions',
        resizeable: true,
        sortable: false,
        flexGrow: 1,
        cellTemplate: this.actionsTemplateCell,
      },
    ];

    this.cdr.detectChanges();
  }

  ngAfterViewChecked() {
    if (
      this.table &&
      this.table.recalculate &&
      this.tableWrapper.nativeElement.clientWidth !== this.currentComponentWidth
    ) {
      this.currentComponentWidth = this.tableWrapper.nativeElement.clientWidth;
      this.table.recalculate();
      this.cdr.detectChanges();
      window.dispatchEvent(new Event('resize'));
    }
  }

  onCreateDataset() {
    this.dialogService
      .open(DatasetFromComponent, {
        autoFocus: true,
        closeOnEsc: true,
        context: {
          policy: this.policy,
        },
        hasScroll: false,
        hasBackdrop: true,
        closeOnBackdropClick: true,
      })
      .onClose.subscribe((resp) => {
        if (resp === DATASET_RESPONSE.CREATED) {
          this.refreshPolicy.emit('refresh-from-dataset');
        }
      });
  }

  onOpenEdit(dataset) {
    this.dialogService
      .open(DatasetFromComponent, {
        autoFocus: true,
        closeOnEsc: false,
        context: {
          dataset,
        },
        hasScroll: false,
        closeOnBackdropClick: true,
        hasBackdrop: true,
      })
      .onClose.subscribe((resp) => {
        if (resp !== DATASET_RESPONSE.CANCELED) {
          this.refreshPolicy.emit('refresh-from-dataset');
        }
      });
  }

  onOpenGroupDetails(agentGroup) {
    this.dialogService
      .open(AgentGroupDetailsComponent, {
        autoFocus: true,
        closeOnEsc: true,
        context: { agentGroup },
        hasScroll: false,
        hasBackdrop: false,
      })
      .onClose.subscribe((resp) => {
        if (resp) {
          this.onOpenEditAgentGroup(agentGroup);
        }
      });
  }

  onOpenEditAgentGroup(agentGroup: any) {
    this.router.navigate([`/pages/fleet/groups/edit/${agentGroup.id}`], {
      state: { agentGroup: agentGroup, edit: true },
      relativeTo: this.route,
    });
  }

  onOpenSinkDetails(sink) {
    this.dialogService
      .open(SinkDetailsComponent, {
        autoFocus: true,
        closeOnEsc: true,
        context: { sink },
        hasScroll: false,
        hasBackdrop: false,
      })
      .onClose.subscribe((resp) => {
        if (resp) {
          this.onOpenEditSink(sink);
        }
      });
  }

  onOpenEditSink(sink: any) {
    this.router.navigate([`pages/sinks/edit/${sink.id}`], {
      relativeTo: this.route,
      state: { sink: sink, edit: true },
    });
  }

  openDeleteModal(row: any) {
    const { name, id } = row;
    this.dialogService
      .open(DatasetDeleteComponent, {
        context: { name },
        autoFocus: true,
        closeOnEsc: true,
      })
      .onClose.subscribe((confirm) => {
        if (confirm) {
          this.datasetService.deleteDataset(id).subscribe(() => {
            this.notificationsService.success(
              'Dataset successfully deleted',
              '',
            );
          });
          this.refreshPolicy.emit('refresh-from-dataset');
        }
      });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }
}
