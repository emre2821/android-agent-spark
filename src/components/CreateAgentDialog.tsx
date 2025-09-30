import React, { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import type { AgentStatus } from '@/types/agent';



interface CreateAgentDialogProps {
  open: boolean;
  onClose: () => void;

export const CreateAgentDialog: React.FC<CreateAgentDialogProps> = ({
  open,
  onClose,
  onSubmit,

      console.error('Failed to create agent', error);
    }
  };

  return (

                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">

              {isSubmitting ? 'Creating...' : 'Create Agent'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
