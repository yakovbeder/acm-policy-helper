import {
  Content,
  ContentVariants,
  Masthead,
  MastheadBrand,
  MastheadContent,
  MastheadMain,
  Page,
  PageSection,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { PolicyWizard } from './components/PolicyWizard/PolicyWizard';
import { ThemeToggle } from './components/ThemeToggle';
import { useTheme } from './hooks/useTheme';

export default function App() {
  const { theme, toggleTheme, isDark } = useTheme();

  const header = (
    <Masthead>
      <MastheadMain>
        <MastheadBrand>
          <Title headingLevel="h1" size="lg">
            ACM Policy Helper
          </Title>
        </MastheadBrand>
      </MastheadMain>
      <MastheadContent>
        <Toolbar id="toolbar" isFullHeight isStatic>
          <ToolbarContent>
            <ToolbarGroup align={{ default: 'alignEnd' }}>
              <ToolbarItem>
                <ThemeToggle theme={theme} onToggle={toggleTheme} />
              </ToolbarItem>
            </ToolbarGroup>
          </ToolbarContent>
        </Toolbar>
      </MastheadContent>
    </Masthead>
  );

  return (
    <Page masthead={header}>
      <PageSection>
        <Content component={ContentVariants.p}>
          Generate Open Cluster Management Configuration Policies, Placements, and
          PlacementBindings from your Kubernetes YAML using the PolicyGenerator.
        </Content>
      </PageSection>
      <PageSection isFilled>
        <PolicyWizard isDark={isDark} />
      </PageSection>
    </Page>
  );
}
