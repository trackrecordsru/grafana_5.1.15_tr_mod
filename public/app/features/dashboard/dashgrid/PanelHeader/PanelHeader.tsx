import { css, cx } from '@emotion/css';
import React, { FC } from 'react';

import { DataLink, GrafanaTheme2, PanelData } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';
import { config  } from '@grafana/runtime';
import { Icon, useStyles2 } from '@grafana/ui';
import { DashboardModel } from 'app/features/dashboard/state/DashboardModel';
import { PanelModel } from 'app/features/dashboard/state/PanelModel';
import { getPanelLinksSupplier } from 'app/features/panel/panellinks/linkSuppliers';

import PanelHeaderCorner from './PanelHeaderCorner';
import { PanelHeaderLoadingIndicator } from './PanelHeaderLoadingIndicator';
import { PanelHeaderMenuTrigger } from './PanelHeaderMenuTrigger';
import { PanelHeaderMenuWrapper } from './PanelHeaderMenuWrapper';
import { PanelHeaderNotices } from './PanelHeaderNotices';

import * as Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {saveAs} from 'file-saver';
import {CSVConfig, DataFrame, dateTimeFormat, toCSV} from "../../../../../../packages/grafana-data";

export interface Props {
  panel: PanelModel;
  dashboard: DashboardModel;
  title?: string;
  description?: string;
  links?: DataLink[];
  error?: string;
  alertState?: string;
  isViewing: boolean;
  isEditing: boolean;
  data: PanelData;
}

export const PanelHeader: FC<Props> = ({ panel, error, isViewing, isEditing, data, alertState, dashboard }) => {
  const onCancelQuery = () => panel.getQueryRunner().cancelQuery();
  const title = panel.getDisplayTitle();
  const className = cx('panel-header', !(isViewing || isEditing) ? 'grid-drag-handle' : '');
  const styles = useStyles2(panelStyles);
  const isAdmin = config.bootData.user.isGrafanaAdmin;

  const exportCsv = (dataFrame: DataFrame, csvConfig: CSVConfig = {}) => {
    const dataFrameCsv = toCSV([dataFrame], csvConfig);
    let jsonData = null;

    Papa.parse(dataFrameCsv, {
      header: true,
      complete: (result) => {
        jsonData = result.data;
      }
    });
    if (jsonData.length === 0){
      return
    }

    function processCellValue(value: any): string | number {
      if (value === null) {
        return "";
      }
      const strValue = value.toString();

      const regex = /^[\d\s]*\.?[\d\s]*$/;

      if (regex.test(strValue)) {
        return Number(strValue.replace(/\s+/g, ''));
      }
      return strValue;
    }
    for (let i = 0; i < jsonData.length; i++) {
      for (let key in jsonData[i]) {
        jsonData[i][key] = processCellValue(jsonData[i][key].toString());
      }
    }

    const ws = XLSX.utils.json_to_sheet(jsonData);

    // Логика определения ширины столбцов
    let wscols = [];
    for (let key in jsonData[0]) { // Используем первую строку как образец для ключей
      let maxLen = key.length; // Заголовки тоже учитываем
      for (let i = 0; i < jsonData.length; i++) {
        const len = jsonData[i][key] && jsonData[i][key].toString().length || 0;
        if (len > maxLen) maxLen = len;
      }
      wscols.push({ wch: maxLen + 1 }); // Добавляем немного пространства для удобства
    }
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    const displayTitle = panel.title;
    const truncatedTitle = displayTitle.length > 31 ? displayTitle.slice(0, 28) + '...' : displayTitle;
    XLSX.utils.book_append_sheet(wb, ws, truncatedTitle);

    const fileName = `${truncatedTitle}-${dateTimeFormat(new Date())}.xlsx`;
    const excelData = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelData], { type: 'application/octet-stream' });
    saveAs(blob, fileName);
  };

  function simulateKeyPressV() {
    const event = new KeyboardEvent("keydown", {
      key: "v",
      code: "KeyV",
      charCode: 86,
      keyCode: 86,
      which: 86,
      bubbles: true,
      cancelable: true
    });

    document.dispatchEvent(event);
  }


  return (
    <>
      <PanelHeaderLoadingIndicator state={data.state} onClick={onCancelQuery} />
      <PanelHeaderCorner
        panel={panel}
        title={panel.title}
        description={panel.description}
        scopedVars={panel.scopedVars}
        links={getPanelLinksSupplier(panel)}
        error={error}
      />
      <div className={className}>
        <PanelHeaderMenuTrigger data-testid={selectors.components.Panels.Panel.title(title)} isAdmin={isAdmin}>
          {({ closeMenu, panelMenuOpen }) => {
            return (
              <div className="panel-title">
                <PanelHeaderNotices frames={data.series} panelId={panel.id} />
                {alertState ? (
                  <Icon
                    name={alertState === 'alerting' ? 'heart-break' : 'heart'}
                    className="icon-gf panel-alert-icon"
                    style={{ marginRight: '4px' }}
                    size="sm"
                  />
                ) : null}
                <h2 className={styles.titleText}>{title}</h2>
                {isAdmin && <Icon name="angle-down" className="panel-menu-toggle" />}
                {isAdmin && <PanelHeaderMenuWrapper panel={panel} dashboard={dashboard} show={panelMenuOpen} onClose={closeMenu} />}
                {data.request && data.request.timeInfo && (
                  <span className="panel-time-info">
                    <Icon name="clock-nine" size="sm" /> {data.request.timeInfo}
                  </span>
                )}
                {panel.type === 'table' && data.series[0] && data.series[0].fields.length > 0 &&
                    <Icon
                        name="file-alt" size="lg"
                        title="Скачать эксель файл"
                        className={`${styles.downloadExcel} panel-menu-toggle`}
                        onClick={(e) =>
                        {
                          e.stopPropagation();
                          exportCsv(data.series[0] as DataFrame);
                        }}
                    />
                }
                <Icon
                  name="eye"
                  size="lg"
                  title="Перейти в полноэкранный режим"
                  className={`${styles.openFullScreen} panel-menu-toggle`}
                  onClick={(e) => {
                    e.stopPropagation();
                    simulateKeyPressV();
                  }}
                />
              </div>
            );
          }}
        </PanelHeaderMenuTrigger>
      </div>
    </>
  );
};

const panelStyles = (theme: GrafanaTheme2) => {
  const isAdmin: boolean = config.bootData.user.isGrafanaAdmin;
  return {
    titleText: css`
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
      max-width: calc(100% - 38px);
      cursor: ${isAdmin ? 'pointer' : 'default'};
      font-weight: ${theme.typography.fontWeightMedium};
      font-size: ${theme.typography.body.fontSize};
      margin: 0;

      &:hover {
        color: ${theme.colors.text.primary};
      }
      .panel-has-alert & {
        max-width: calc(100% - 54px);
      }
    `,
    downloadExcel: css`
      position: absolute;
      fill: #1D6F42;

      .panel-container & {
        right: 30px;
      }

      .panel-container.panel-container--no-title & {
        right: calc(30px - min(50px, 10%));
      }

      .panel-container.panel-container--no-title .panel-header:hover & {
        right: 30px;
      }
    `,
    openFullScreen: css`
      position: absolute;

      .panel-container & {
        right: 50px;
      }

      .panel-container.panel-container--no-title & {
        right: calc(50px - min(50px, 10%));
      }

      .panel-container.panel-container--no-title .panel-header:hover & {
        right: 50px;
      }
    `
  };
};
