import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { all_routes } from '../../routes/all_routes';

interface PageHeaderProps {
  title?: string;
  badgeCount?: any;
  showExport?: boolean;
  moduleTitle?: string;
  moduleLink?: string;
  showModuleTile: any;
  exportComponent?: ReactNode;
  onRefresh?: () => void;
  settingsLink?: string;
  titleDropdown?: ReactNode;
}

const PageHeader = ({ title = "", badgeCount = null, showExport = false, moduleTitle = "", moduleLink = "#", showModuleTile = true, exportComponent, onRefresh, settingsLink, titleDropdown }: PageHeaderProps) => {
  return (
    <div className="d-flex align-items-center justify-content-between gap-2 mb-4 flex-wrap">
      <div>
        {titleDropdown ? (
          titleDropdown
        ) : (
          <>
            <h4 className="mb-1 d-flex align-items-center gap-2" style={{ fontSize: '18px', fontWeight: 600, lineHeight: 1.3 }}>
              {title}
              {badgeCount !== null && badgeCount !== false && badgeCount !== undefined && (
                <span style={{
                  fontSize: 12,
                  padding: '2px 5px',
                  borderRadius: 6,
                  background: '#fff1f0',
                  color: '#e41f07',
                  fontWeight: 500,
                  border: '1px solid #ffccc7',
                  borderBottom: '2px solid #ffa39e',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1.5,
                }}>{badgeCount}</span>
              )}
            </h4>
            <div className="d-flex align-items-center gap-1" style={{ fontSize: '14px' }}>
              <Link to={all_routes.dealsDashboard} className="text-muted" style={{ fontSize: '14px', textDecoration: 'none' }}>Home</Link>
              <i className="ti ti-chevron-right text-muted" style={{ fontSize: 12, lineHeight: 1 }} />
              {showModuleTile && (
                <>
                  <Link to={moduleLink} className="text-muted" style={{ fontSize: '14px', textDecoration: 'none' }}>{moduleTitle}</Link>
                  <i className="ti ti-chevron-right text-muted" style={{ fontSize: 12, lineHeight: 1 }} />
                </>
              )}
              <span className="text-dark fw-medium" style={{ fontSize: '14px' }}>{title}</span>
            </div>
          </>
        )}
      </div>

      <div className="gap-2 d-flex align-items-center flex-wrap">
        {showExport && (
          <div className="dropdown">
            <Link
              to="#"
              className="dropdown-toggle btn btn-outline-light px-2 shadow"
              data-bs-toggle="dropdown"
            >
              <i className="ti ti-package-export me-2" />
              Export
            </Link>
            <div className="dropdown-menu dropdown-menu-end">
              <ul>
                <li>
                  <Link to="#" className="dropdown-item">
                    <i className="ti ti-file-type-pdf me-1" />
                    Export as PDF
                  </Link>
                </li>
                <li>
                  <Link to="#" className="dropdown-item">
                    <i className="ti ti-file-type-xls me-1" />
                    Export as Excel
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        )}

        {exportComponent && exportComponent}

        {onRefresh && (
          <Link
            to="#"
            className="btn btn-icon btn-outline-light shadow"
            data-bs-toggle="tooltip"
            data-bs-placement="top"
            data-bs-title="Refresh"
            aria-label="Refresh"
            onClick={(e) => { e.preventDefault(); onRefresh?.(); }}
          >
            <i className="ti ti-refresh" />
          </Link>
        )}

        {settingsLink && (
          <Link
            to={settingsLink}
            className="btn btn-icon btn-outline-light shadow"
            aria-label="Settings"
            title="Settings"
          >
            <i className="ti ti-settings" />
          </Link>
        )}

      </div>
    </div>
  );
};

export default PageHeader;
