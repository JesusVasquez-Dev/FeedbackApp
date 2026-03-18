import React, { useEffect, useState } from 'react';
import Card from '../modules/ui/Card';
import { fetchEmployees, EmployeeListItem } from '../modules/api/employees';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const [items, setItems] = useState<EmployeeListItem[]>([]);

  useEffect(() => {
    fetchEmployees().then((res) => setItems(res.employees)).catch(() => {});
  }, []);

  return (
    <div className="container-app py-8">
      <Card title="Employees">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Start</th>
                <th className="py-2 pr-4">Progress</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((e) => (
                <tr key={e.id} className="border-t">
                  <td className="py-2 pr-4 font-medium text-gray-900">{e.name || '—'}</td>
                  <td className="py-2 pr-4">{e.email}</td>
                  <td className="py-2 pr-4">{e.role}</td>
                  <td className="py-2 pr-4">{new Date(e.start_date).toLocaleDateString()}</td>
                  <td className="py-2 pr-4">{e.progressPercent}%</td>
                  <td className="py-2 pr-4">
                    <Link to={`/admin/employees/${e.id}`} className="text-primary-700 hover:underline">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
