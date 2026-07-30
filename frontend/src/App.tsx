import {
  Brand,
  Content,
  ContentVariants,
  Flex,
  FlexItem,
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
import redhatLogo from '/Logo-Red.svg';
import redhatLogoDark from '/Logo-Red-Reverse.svg';

export default function App() {
  const { theme, toggleTheme, isDark } = useTheme();

  const header = (
    <Masthead>
      <MastheadMain>
        <MastheadBrand>
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            spaceItems={{ default: 'spaceItemsMd' }}
            flexWrap={{ default: 'nowrap' }}
          >
            <FlexItem>
              <Brand
                src={isDark ? redhatLogoDark : redhatLogo}
                alt="Red Hat"
                heights={{ default: '36px' }}
              />
            </FlexItem>
            <FlexItem>
              <Title
                headingLevel="h1"
                size="2xl"
                style={{ lineHeight: 1.15, margin: 0 }}
              >
                ACM Policy Helper
              </Title>
              <Content
                component={ContentVariants.small}
                style={{
                  color: 'var(--pf-t--global--text--color--subtle)',
                  marginTop: 0,
                }}
              >
                Generate ACM Configuration Policies from YAML
              </Content>
            </FlexItem>
          </Flex>
        </MastheadBrand>
      </MastheadMain>
      <MastheadContent>
        <Toolbar id="toolbar" isFullHeight isStatic style={{ width: '100%' }}>
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
