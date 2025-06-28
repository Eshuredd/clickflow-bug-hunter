
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Plus, Settings, Github, MessageSquare } from 'lucide-react';

export const TeamWorkspace = () => {
  const teamMembers = [
    { name: 'Sarah Chen', role: 'QA Lead', avatar: '/placeholder.svg', status: 'online' },
    { name: 'Mike Johnson', role: 'Developer', avatar: '/placeholder.svg', status: 'away' },
    { name: 'Emily Davis', role: 'Product Manager', avatar: '/placeholder.svg', status: 'online' },
    { name: 'Alex Rodriguez', role: 'Developer', avatar: '/placeholder.svg', status: 'offline' }
  ];

  const activeProjects = [
    { name: 'E-commerce Redesign', bugs: 23, assigned: 'Sarah Chen', priority: 'High' },
    { name: 'Mobile App Launch', bugs: 8, assigned: 'Mike Johnson', priority: 'Critical' },
    { name: 'Marketing Website', bugs: 15, assigned: 'Emily Davis', priority: 'Medium' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Team Workspace</h2>
          <p className="text-slate-400">Collaborate with your team on bug detection and resolution</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Invite Member
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Team Members */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Members
            </CardTitle>
            <CardDescription className="text-slate-400">
              Current workspace members and their roles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {teamMembers.map((member, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback className="bg-slate-600 text-white text-sm">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-white font-medium">{member.name}</p>
                      <p className="text-slate-400 text-sm">{member.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      member.status === 'online' ? 'bg-green-400' : 
                      member.status === 'away' ? 'bg-yellow-400' : 'bg-gray-400'
                    }`} />
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Active Projects */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Active Projects</CardTitle>
            <CardDescription className="text-slate-400">
              Current bug detection projects and assignments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeProjects.map((project, index) => (
                <div key={index} className="p-3 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-white font-medium">{project.name}</h4>
                    <Badge className={`${
                      project.priority === 'Critical' ? 'bg-red-600' :
                      project.priority === 'High' ? 'bg-orange-500' : 'bg-yellow-500'
                    } text-white`}>
                      {project.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">{project.bugs} bugs found</span>
                    <span className="text-slate-300">Assigned to {project.assigned}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integrations */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Team Integrations</CardTitle>
          <CardDescription className="text-slate-400">
            Connect with your existing development and project management tools
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
              <div className="flex items-center gap-3 mb-2">
                <Github className="h-6 w-6 text-white" />
                <span className="text-white font-medium">GitHub</span>
              </div>
              <p className="text-slate-400 text-sm mb-3">
                Automatically create issues for detected bugs
              </p>
              <Button size="sm" className="w-full bg-slate-600 hover:bg-slate-500">
                Connect
              </Button>
            </div>

            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center text-white text-xs font-bold">
                  J
                </div>
                <span className="text-white font-medium">Jira</span>
              </div>
              <p className="text-slate-400 text-sm mb-3">
                Sync bug reports with your project tracking
              </p>
              <Button size="sm" className="w-full bg-slate-600 hover:bg-slate-500">
                Connect
              </Button>
            </div>

            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-6 h-6 bg-purple-500 rounded flex items-center justify-center text-white text-xs font-bold">
                  S
                </div>
                <span className="text-white font-medium">Slack</span>
              </div>
              <p className="text-slate-400 text-sm mb-3">
                Get real-time notifications in your channels
              </p>
              <Button size="sm" className="w-full bg-slate-600 hover:bg-slate-500">
                Connect
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
