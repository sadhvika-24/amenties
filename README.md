\# **AmenityHub – Multi-Tenant Amenity Management System**



AmenityHub is a web application designed to help organizations manage amenities, employees, bookings, and user permissions through a centralized dashboard.



\## **Features**



\- \*\***Organization Registration and Login:**\*\* Organization-specific registration and authentication.

\- \*\***Multi-Tenant Database Architecture:**\*\* A master database stores organization information, while each organization uses its own tenant database.

\- \*\***Free Trial:**\*\* 14-day trial period with subscription status displayed on the dashboard.

\- \*\***Amenity Management:**\*\* Create, view, update, delete, and publish amenities, subject to permissions.

\- \*\***Booking Management:**\*\* View and manage booking history based on assigned permissions.

\- \*\***Employee Management:**\*\* Maintain employee records.

\- \*\***User and Role Management:**\*\* Support role-based access for Super Admin, Operation Manager, and Receptionist.

\- \*\***Secure Authentication:**\*\* Password hashing and session authentication.



\## **Technology Stack**



\- \*\***Frontend:**\*\* Next.js, React, JavaScript

\- \*\***Backend:**\*\* Next.js API Routes

\- \*\***Database:**\*\* PostgreSQL using Neon

\- \*\***Authentication:**\*\* JSON Web Tokens (JWT), HTTP-only session cookies

\- \*\***Password Security:**\*\* bcrypt

\- \*\***Version Control:**\*\* Git and GitHub



\## **Database Architecture**



**### Master Database**



**Stores organization-level information, including:**



\- Organization ID and name

\- Organization email

\- Password hash

\- Tenant database name

\- Trial start and end dates

\- Subscription status



\### **Tenant Database**



**Stores organization-specific application data, including:**



\- Amenities

\- Employees

\- Booking history

\- Users

\- Roles and permissions



\## **User Roles**



| Role | Intended Permissions |

|---|---|

| Super Admin | Organization administration and user/role management |

| Operation Manager | Amenity CRUD, publishing, and booking history access |

| Receptionist | Amenity read access and booking history read/update access |



Actual permissions depend on the application's implemented authorization rules.



\## Getting Started



\### Prerequisites



\- Node.js and npm

\- A Neon PostgreSQL account

\- Git



\### Installation



**1. Clone the repository:**



&#x20;  ```bash

&#x20;  git clone https://github.com/sadhvika-24/amenties.git

&#x20;  ```



**2. Open the project directory:**



&#x20;  ```bash

&#x20;  cd amenties

&#x20;  ```



**3. Install dependencies:**



&#x20;  ```bash

&#x20;  npm install

&#x20;  ```



**4. Create a `.env.local` file in the project root and configure the required environment variables:**



&#x20;  ```env

&#x20;  MASTER\_DB\_URL=your\_neon\_postgresql\_connection\_string

&#x20;  JWT\_SECRET=your\_long\_random\_secret

&#x20;  ```



&#x20;  Replace the example values with your own credentials. Never commit `.env.local` or publish database passwords, API keys, or JWT secrets.



5\. Configure the master and tenant database schemas using the SQL files provided in the repository. Ensure the schema matches the current application code.



6\. Start the development server:



&#x20;  ```bash

&#x20;  npm run dev

&#x20;  ```



7\. Open \[http://localhost:3000](http://localhost:3000).



\### Production Build



```bash

npm run build

npm start

```



\## **Subscription and Trial**



New organizations are intended to receive a 14-day free trial. The dashboard displays the subscription status and trial information. Complete server-side subscription enforcement and payment integration may be required before production use.



\## **Project Status**



This project is under development. Validate authentication, tenant isolation, database permissions, subscription enforcement, and all CRUD operations before deploying to production.



\## **Author**



Developed as a full-stack application project using Next.js and Neon PostgreSQL.

