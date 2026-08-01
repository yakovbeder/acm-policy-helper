/**
 * Use the npm monaco-editor package instead of the default CDN loader.
 * Required for offline/OpenShift environments and deterministic e2e.
 * @see https://github.com/patternfly/patternfly-react/blob/main/packages/react-code-editor/README.md
 */
import * as monaco from 'monaco-editor';
import { loader } from '@monaco-editor/react';

loader.config({ monaco });
